// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const ImovelAvulso = require('../models/ImovelAvulso');
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');
const PropostaContrato = require('../models/PropostaContrato');
const Parcela = require('../models/Parcela')
require('../models/ImovelAvulso');


const Company = require('../models/Company');

/**
 * Cria uma nova reserva para um Imóvel (Unidade ou Avulso).
 * @param {object} reservaData - Dados da reserva (validade, sinal, etc.).
 * @param {string} leadId - ID do Lead.
 * @param {string} imovelId - ID do imóvel (pode ser Unidade ou ImovelAvulso).
 * @param {string} tipoImovel - 'Unidade' ou 'ImovelAvulso'.
 * @param {string} companyId - ID da empresa.
 * @param {string} creatingUserId - ID do usuário.
 */
const createReserva = async (reservaData, leadId, imovelId, tipoImovel, companyId, creatingUserId) => {

  const { validadeReserva, valorSinal, observacoesReserva } = reservaData;
  console.log('[DEBUG] reservaData:', reservaData);
  console.log(`[ReservaService] Iniciando reserva para Lead ${leadId}, Imóvel ${imovelId}, Tipo ${tipoImovel}`);

  if (!['Unidade', 'ImovelAvulso'].includes(tipoImovel)) {
    throw new Error("Tipo de imóvel inválido. Use 'Unidade' ou 'ImovelAvulso'.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --- Validação de IDs ---
    const ids = { leadId, imovelId, companyId, creatingUserId };
    for (const [key, value] of Object.entries(ids)) {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`ID inválido para ${key}.`);
      }
    }

    // --- 1. Buscar Lead ---
    const lead = await Lead.findOne({ _id: leadId, company: companyId }).session(session);
    if (!lead) throw new Error("Lead não encontrado ou não pertence à empresa.");

    // --- 2. Buscar/Validar Imóvel ---
    const ImovelModel = mongoose.model(tipoImovel);
    const imovel = await ImovelModel.findOne({ _id: imovelId, company: companyId }).session(session);
    if (!imovel) throw new Error(`${tipoImovel} não encontrado ou não pertence à empresa.`);
    const statusAtual = imovel.statusUnidade || imovel.status || imovel.statusImovel;

    if (statusAtual !== 'Disponível') {
      throw new Error(`Imóvel não disponível. Status atual: ${statusAtual || 'Desconhecido'}.`);
    }

    // --- 3. Buscar ou Criar Estágio "Em Reserva" ---
    let stageReserva = await LeadStage.findOne({
      company: companyId,
      nome: { $regex: /^Em Reserva$/i }
    }).select('_id').lean();

    if (!stageReserva) {
      const novoStage = await new LeadStage({
        nome: "Em Reserva",
        descricao: "Lead com unidade reservada.",
        company: companyId,
        ativo: true
      }).save({ session });
      stageReserva = { _id: novoStage._id };
      console.log(`[ReservaService] Estágio 'Em Reserva' criado: ${stageReserva._id}`);
    }

    // --- 4. Criar Reserva ---
    const validade = new Date(validadeReserva);
    // Normaliza as datas para comparar só a parte do dia (sem horas)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    validade.setHours(0, 0, 0, 0);

    if (!validade || validade < hoje) {
      throw new Error("Validade da reserva inválida.");
    }

    const reserva = new Reserva({
      ...reservaData,
      lead: leadId,
      imovel: imovelId,
      tipoImovel,
      company: companyId,
      createdBy: creatingUserId,
      statusReserva: "Ativa"
    });

    const reservaSalva = await reserva.save({ session });

    // --- 5. Atualiza Imóvel ---
    imovel.status = 'Reservado';
    imovel.currentLeadId = leadId;
    imovel.currentReservaId = reservaSalva._id;
    await imovel.save({ session });

    // --- 6. Atualiza Lead ---
    const oldStage = lead.situacao;
    lead.situacao = stageReserva._id;
    lead.unidadeInteresse = imovelId;
    await lead.save({ session });

    // --- 7. Histórico ---
    await logHistory(
      leadId,
      creatingUserId,
      "RESERVA_CRIADA",
      `Imóvel ${imovelId} reservado (${tipoImovel}).`,
      {
        reservaId: reservaSalva._id,
        imovelId,
        oldLeadStatusId: oldStage,
        newLeadStatusId: stageReserva._id
      }
    );

    await session.commitTransaction();
    console.log(`[ReservaService] Reserva ${reservaSalva._id} criada com sucesso.`);
    return reservaSalva;

  } catch (err) {
    await session.abortTransaction();
    console.error("[ReservaService] Erro:", err);
    if (err.code === 11000 && err.message.includes('imovel_statusReserva_ativa_unique_idx')) {
      throw new Error('Já existe uma reserva ativa para este imóvel.');
    }
    throw new Error(err.message || 'Erro interno ao criar reserva.');
  } finally {
    session.endSession();
  }
};


/**
 * Busca reservas de uma empresa com filtros e paginação.
 * @param {string} companyId - ID da empresa.
 * @param {object} queryParams - Parâmetros da query (filtros e paginação).
 */
const getReservasByCompany = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const queryConditions = { company: companyId };

  // ---- Filtros ----
  // status: aceita múltiplos, separados por vírgula, case-insensitive
  if (queryParams.status) {
    const list = String(queryParams.status)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (list.length) {
      queryConditions.statusReserva = {
        $in: list.map(s => new RegExp(`^${s}$`, 'i'))
      };
    }
  }

  // tipoImovel: 'Unidade' | 'ImovelAvulso'
  if (queryParams.tipoImovel) {
    queryConditions.tipoImovel = queryParams.tipoImovel;
  }

  // período (dataReserva)
  const { from, to } = queryParams;
  if (from || to) {
    const d = {};
    if (from) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      d.$gte = start;
    }
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      d.$lte = end;
    }
    queryConditions.dataReserva = d;
  }
  // ------------------

  try {
    const [totalReservas, reservas] = await Promise.all([
      Reserva.countDocuments(queryConditions),
      Reserva.find(queryConditions)
        .populate('lead', 'nome email contato')
        .populate('createdBy', 'nome')
        .populate({
          path: 'imovel',
          populate: { path: 'empreendimento', select: 'nome', strictPopulate: false }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    reservas.forEach(res => {
      if (res.tipoImovel === 'ImovelAvulso') {
        res.empreendimento = { nome: 'Avulso' };
      } else if (res.imovel?.empreendimento?.nome) {
        res.empreendimento = res.imovel.empreendimento;
      } else {
        res.empreendimento = { nome: 'N/A' };
      }
    });

    const totalPages = Math.ceil(totalReservas / limit) || 1;
    return { reservas, total: totalReservas, totalPages, currentPage: page };
  } catch (error) {
    console.error("[ReservaService] Erro ao buscar reservas:", error);
    throw new Error("Erro ao buscar reservas.");
  }
};



/**
 * Busca uma reserva específica por ID, garantindo que pertence à empresa,
 * e popula os campos de forma polimórfica.
 * @param {string} reservaId - ID da Reserva.
 * @param {string} companyId - ID da Empresa.
 * @returns {Promise<Reserva|null>} A reserva encontrada ou null.
 */
const getReservaById = async (reservaId, companyId) => {
  if (!mongoose.Types.ObjectId.isValid(reservaId) || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da Reserva ou da Empresa inválido.");
  }

  console.log(`[ReservaService] Buscando Reserva ID: ${reservaId} para Company: ${companyId}`);

  try {
    const reserva = await Reserva.findOne({ _id: reservaId, company: companyId })
      .populate({
        path: 'lead',
        select: 'nome email contato cpf rg estadoCivil profissao nacionalidade endereco coadquirentes'
      })
      .populate({
        path: 'createdBy',
        select: 'nome email'
      })
      .populate('imovel') // Mongoose resolve com base no tipoImovel via refPath
      .populate({
        path: 'imovel.empreendimento',
        select: 'nome localizacao'
      })
      .lean();

    if (!reserva) {
      console.log(`[ReservaService] Reserva ID: ${reservaId} não encontrada para Company: ${companyId}.`);
      return null;
    }

    const empresaVendedora = await Company.findById(companyId)
      .select('nome razaoSocial cnpj endereco representanteLegalNome representanteLegalCPF')
      .lean();

    reserva.companyData = empresaVendedora || {};

    console.log('[ReservaService] imovel:', reserva.imovel);
    return reserva;

  } catch (error) {
    console.error(`[ReservaService] Erro ao buscar reserva ${reservaId}:`, error);
    throw new Error("Erro ao buscar reserva por ID.");
  }
};


async function deleteReserva(reservaId, companyId, userId, opts = {}) {
  const { cascade = true } = opts;

  if (!mongoose.Types.ObjectId.isValid(reservaId) || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error('ID inválido.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Carrega a reserva da empresa
    const reserva = await Reserva.findOne({ _id: reservaId, company: companyId }).session(session);
    if (!reserva) throw new Error('Reserva não encontrada para esta empresa.');

    // Bloqueio de negócio
    if (String(reserva.statusReserva).toLowerCase() === 'convertidaemvenda') {
      throw new Error('Não é possível excluir: a reserva já foi convertida em venda. Use distrato/cancelamento.');
    }

    // 1.1) Se houver proposta vinculada e cascade=true, apaga a proposta com segurança
    let propostaFoiApagada = false;
    let propostaApagadaId = null;

    if (cascade && reserva.propostaId) {
      const proposta = await PropostaContrato.findOne({
        _id: reserva.propostaId,
        company: companyId,
      }).session(session);

      if (proposta) {
        const status = String(proposta.statusPropostaContrato || '').toLowerCase();
        if (status === 'vendido' || status === 'distrato realizado') {
          throw new Error('Não é possível excluir: a proposta vinculada está Vendida/Distratada. Use o fluxo de distrato.');
        }

        // impede deletar se existe parcela paga
        const existeParcelaPaga = await Parcela.exists({
          company: companyId,
          propostaContrato: proposta._id,
          status: 'Pago'
        }).session(session);
        if (existeParcelaPaga) {
          throw new Error('Não é possível excluir: existem parcelas pagas. Use cancelamento/distrato.');
        }

        // remove parcelas não pagas (se existirem)
        await Parcela.deleteMany({ company: companyId, propostaContrato: proposta._id }).session(session);

        await PropostaContrato.deleteOne({ _id: proposta._id }).session(session);
        propostaFoiApagada = true;
        propostaApagadaId = proposta._id;
      }
    }

    // 2) Resolve modelo do imóvel de forma resiliente (para log e fallback)
    const modelNames = new Set(mongoose.modelNames());
    const desired = String(reserva.tipoImovel || '').trim();
    let imovel = null;
    let imovelModelUsed = null;

    const fetchBy = async (modelName) => {
      const Model = mongoose.model(modelName);
      return Model.findOne({ _id: reserva.imovel, company: companyId }).session(session);
    };

    if (desired && modelNames.has(desired)) {
      imovel = await fetchBy(desired);
      imovelModelUsed = desired;
    }
    if (!imovel && modelNames.has('Unidade')) {
      const tryU = await fetchBy('Unidade');
      if (tryU) { imovel = tryU; imovelModelUsed = 'Unidade'; }
    }
    if (!imovel && modelNames.has('ImovelAvulso')) {
      const tryA = await fetchBy('ImovelAvulso');
      if (tryA) { imovel = tryA; imovelModelUsed = 'ImovelAvulso'; }
    }

    // 3) Lead (se não existir, seguimos)
    let lead = null;
    if (reserva.lead) {
      lead = await Lead.findOne({ _id: reserva.lead, company: companyId }).session(session);
      if (!lead) {
        console.warn(`[ReservaService] Lead relacionado não encontrado (reserva ${reservaId}). Prosseguindo.`);
      }
    }

    // 4) Liberar imóvel (SEMPRE setar Disponível para Unidade e Avulso)
    const unsetCommon = { currentLeadId: '', currentReservaId: '', reservaId: '' };

    if (imovelModelUsed === 'Unidade') {
      await Unidade.updateOne(
        { _id: reserva.imovel, company: companyId },
        { $set: { statusUnidade: 'Disponível', status: 'Disponível' }, $unset: unsetCommon }
      ).session(session);
    } else if (imovelModelUsed === 'ImovelAvulso') {
      await ImovelAvulso.updateOne(
        { _id: reserva.imovel, company: companyId },
        { $set: { statusImovel: 'Disponível', status: 'Disponível' }, $unset: unsetCommon }
      ).session(session);
    } else {
      // Fallback defensivo: tenta atualizar nos dois modelos (apenas um vai casar)
      await Unidade.updateOne(
        { _id: reserva.imovel, company: companyId },
        { $set: { statusUnidade: 'Disponível', status: 'Disponível' }, $unset: unsetCommon }
      ).session(session);
      await ImovelAvulso.updateOne(
        { _id: reserva.imovel, company: companyId },
        { $set: { statusImovel: 'Disponível', status: 'Disponível' }, $unset: unsetCommon }
      ).session(session);
    }

    // 5) Ajustar lead (se existir)
    if (lead) {
      const stageAtendimento = await LeadStage.findOne({
        company: companyId, nome: { $regex: /^Em Atendimento$/i }
      }).select('_id').lean();

      if (stageAtendimento) {
        lead.situacao = stageAtendimento._id;
      }
      if ('unidadeInteresse' in lead && String(lead.unidadeInteresse || '') === String(reserva.imovel || '')) {
        lead.unidadeInteresse = undefined;
      }
      await lead.save({ session });

      await logHistory(
        lead._id,
        userId,
        'RESERVA_CANCELADA',
        `Reserva ${reservaId} excluída. ${propostaFoiApagada ? `Proposta ${propostaApagadaId} removida. ` : ''}Imóvel liberado (${imovelModelUsed || desired || 'desconhecido'}:${reserva.imovel}).`,
        {
          reservaId,
          propostaDeletada: propostaFoiApagada,
          propostaId: propostaApagadaId,
          imovelId: reserva.imovel,
          tipoImovel: imovelModelUsed || desired || null
        }
      );
    }

    // 6) Excluir reserva
    await Reserva.deleteOne({ _id: reservaId, company: companyId }).session(session);

    await session.commitTransaction();
    return {
      ok: true,
      reservaId,
      propostaDeletada: propostaFoiApagada,
      propostaId: propostaApagadaId,
      imovelId: reserva.imovel,
      leadId: lead?._id || null
    };
  } catch (err) {
    await session.abortTransaction();
    throw new Error(err.message || 'Erro ao excluir reserva.');
  } finally {
    session.endSession();
  }
}






module.exports = {
  createReserva,
  getReservasByCompany,
  getReservaById,
  deleteReserva

};