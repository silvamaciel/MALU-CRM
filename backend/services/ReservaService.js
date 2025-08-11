// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
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
    throw new Error("ID inválido.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) carrega a reserva garantindo que pertence à company
    const reserva = await Reserva.findOne({ _id: reservaId, company: companyId }).session(session);
    if (!reserva) throw new Error("Reserva não encontrada.");

    // regra de negócio: não permitir excluir se já virou proposta/venda
    const status = String(reserva.statusReserva || '').toLowerCase();
    const bloqueados = ['convertidaemproposta', 'convertidaemvenda'];
    if (bloqueados.includes(status)) {
      throw new Error("Não é permitido excluir uma reserva já convertida.");
    }

    // 2) carrega lead e imóvel (polimórfico)
    const lead = await Lead.findOne({ _id: reserva.lead, company: companyId }).session(session);
    if (!lead) throw new Error("Lead relacionado não encontrado.");

    const ImovelModel = mongoose.model(reserva.tipoImovel); // 'Unidade' ou 'ImovelAvulso'
    const imovel = await ImovelModel.findOne({ _id: reserva.imovel, company: companyId }).session(session);
    if (!imovel) throw new Error("Imóvel relacionado não encontrado.");

    // 3) reverte imóvel para disponível (se ele ainda estiver apontando para essa reserva)
    if (String(imovel.currentReservaId || '') === String(reserva._id)) {
      imovel.status = 'Disponível';
      imovel.currentLeadId = null;
      imovel.currentReservaId = null;
      await imovel.save({ session });
    }

    // 4) se o lead estiver em "Em Reserva", tentar voltar para "Em Atendimento"
    // (não é obrigatório; se não achar, só remove a unidadeInteresse)
    const leadStageAtual = String(lead.situacao || '');
    let stageAtendimento = await LeadStage.findOne({
      company: companyId,
      nome: { $regex: /^Em Atendimento$/i }
    }).select('_id').lean();

    if (stageAtendimento && leadStageAtual) {
      const stageReserva = await LeadStage.findOne({
        company: companyId,
        nome: { $regex: /^Em Reserva$/i }
      }).select('_id').lean();

      if (stageReserva && String(stageReserva._id) === leadStageAtual) {
        lead.situacao = stageAtendimento._id;
      }
    }

    // limpa o vínculo da unidade de interesse se for esta mesma
    if (String(lead.unidadeInteresse || '') === String(imovel._id)) {
      lead.unidadeInteresse = null;
    }
    await lead.save({ session });

    // 5) remove efetivamente a reserva
    await Reserva.deleteOne({ _id: reserva._id }).session(session);

    // 6) histórico
    await logHistory(
      lead._id,
      userId,
      "RESERVA_EXCLUIDA",
      `Reserva ${reserva._id} excluída para o imóvel ${imovel._id} (${reserva.tipoImovel}).`,
      { reservaId: reserva._id, imovelId: imovel._id, previousStatus: reserva.statusReserva }
    );

    await session.commitTransaction();
    return { ok: true };
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