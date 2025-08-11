// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const ImovelAvulso = require('../models/ImovelAvulso');
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');
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
  console.log(`[ReservaService] Buscando reservas para Company: ${companyId}, Query Params:`, queryParams);

  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const queryConditions = { company: companyId };

  try {
    const [totalReservas, reservas] = await Promise.all([
      Reserva.countDocuments(queryConditions),
      Reserva.find(queryConditions)
        .populate('lead', 'nome email contato')
        .populate('createdBy', 'nome')
        .populate({
          path: 'imovel',
          populate: {
            path: 'empreendimento',
            select: 'nome',
            strictPopulate: false // <- evita erro com ImovelAvulso
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // Fallback: injeta empreendimento virtual como "Avulso" se for ImovelAvulso
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
    console.log(`[ReservaService] ${totalReservas} reservas encontradas para Company: ${companyId}`);

    return {
      reservas,
      total: totalReservas,
      totalPages,
      currentPage: page
    };

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


async function deleteReserva(reservaId, companyId, userId) {
  if (!mongoose.Types.ObjectId.isValid(reservaId) || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error('ID inválido.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Reserva da empresa
    const reserva = await Reserva.findOne({ _id: reservaId, company: companyId }).session(session);
    if (!reserva) throw new Error('Reserva não encontrada para esta empresa.');

    // 2) Resolve modelo do imóvel de forma resiliente
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

    // 4) Liberar imóvel (se encontrado)
    if (imovel) {
      if ('currentLeadId' in imovel) imovel.currentLeadId = undefined;
      if ('currentReservaId' in imovel) imovel.currentReservaId = undefined;

      if ('statusUnidade' in imovel) imovel.statusUnidade = 'Disponível';
      else if ('statusImovel' in imovel) imovel.statusImovel = 'Disponível';
      else if ('status' in imovel) imovel.status = 'Disponível';

      await imovel.save({ session });
    } else {
      console.warn(`[ReservaService] Imóvel não localizado (reserva ${reservaId}). Tipo informado: "${desired}".`);
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
        `Reserva ${reservaId} excluída. Imóvel liberado${imovel ? ` (${imovelModelUsed}:${imovel._id})` : ''}.`,
        { reservaId, imovelId: imovel?._id || null, tipoImovel: imovelModelUsed || desired || null }
      );
    }

    // 6) Excluir reserva
    await Reserva.deleteOne({ _id: reservaId, company: companyId }).session(session);

    await session.commitTransaction();
    return { ok: true, reservaId, imovelId: imovel?._id || null, leadId: lead?._id || null };
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