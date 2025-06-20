// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');

/**
 * Cria uma nova reserva para um Imóvel (Unidade ou Avulso).
 * @param {object} reservaData - Dados da reserva (validade, sinal, etc.).
 * @param {string} leadId - ID do Lead.
 * @param {string} imovelId - ID do imóvel (pode ser Unidade ou ImovelAvulso).
 * @param {string} tipoImovel - 'Unidade' ou 'ImovelAvulso'.
 * @param {string} companyId - ID da empresa.
 * @param {string} creatingUserId - ID do usuário.
 */
const createReserva = async (reservaData, companyId, creatingUserId) => {
    const { leadId, imovelId, tipoImovel, validadeReserva } = reservaData;

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
        if (imovel.status !== 'Disponível') throw new Error(`Imóvel não disponível. Status atual: ${imovel.status}.`);

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
        hoje.setHours(0,0,0,0);
        validade.setHours(0,0,0,0);

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
 * Lista todas as reservas de uma empresa com paginação e filtros.
 * @param {string} companyId - ID da empresa.
 * @param {object} filters - Objeto com filtros (ex: { statusReserva: 'Ativa', empreendimentoId: '...' }).
 * @param {object} paginationOptions - Opções de paginação (page, limit).
 * @returns {Promise<{reservas: Array<Reserva>, total: number, page: number, pages: number}>}
 */
const getReservasByCompany = async (companyId, filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido.');
    }

    const page = parseInt(paginationOptions.page, 10) || 1;
    const limit = parseInt(paginationOptions.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Começa com as condições base
    const queryConditions = { company: companyId, ...filters };

    // Remove filtros com valores vazios ou nulos para não interferir na query
    for (const key in queryConditions) {
        if (queryConditions[key] === null || queryConditions[key] === undefined || queryConditions[key] === '') {
            delete queryConditions[key];
        }
        // Converte IDs de filtro para ObjectId se forem strings válidas
        if (['lead', 'empreendimento', 'unidade', 'createdBy'].includes(key) && 
            queryConditions[key] && 
            mongoose.Types.ObjectId.isValid(queryConditions[key])) {
            queryConditions[key] = new mongoose.Types.ObjectId(queryConditions[key]);
        }
    }
    
    console.log(`[ReservaService] Buscando reservas para Company: ${companyId}, Condições:`, queryConditions);

    try {
        const reservas = await Reserva.find(queryConditions)
            .populate({ path: 'lead', select: 'nome email contato' }) // Popula nome do lead
            .populate({ path: 'unidade', select: 'identificador tipologia' }) // Popula identificador da unidade
            .populate({ path: 'empreendimento', select: 'nome' }) // Popula nome do empreendimento
            .populate({ path: 'createdBy', select: 'nome' }) // Popula nome do usuário que criou
            .sort({ dataReserva: -1 }) // Ordena pelas mais recentes primeiro
            .skip(skip)
            .limit(limit)
            .lean();

        const totalReservas = await Reserva.countDocuments(queryConditions);

        console.log(`[ReservaService] ${totalReservas} reservas encontradas para Company: ${companyId}`);
        return {
            reservas,
            total: totalReservas,
            page,
            pages: Math.ceil(totalReservas / limit) || 1
        };
    } catch (error) {
        console.error("[ReservaService] Erro ao buscar reservas:", error);
        throw new Error("Erro ao buscar reservas.");
    }
};

const getReservaById = async (reservaId, companyId) => {

    const reserva = await Reserva.findOne({ _id: reservaId, company: companyId })
        .populate('lead', 'nome email contato cpf endereco estadoCivil profissao nacionalidade company') // Popula mais campos do lead
        .populate({ 
            path: 'unidade', 
            select: 'identificador tipologia areaUtil precoTabela statusUnidade empreendimento',
            populate: { path: 'empreendimento', select: 'nome localizacao' } // Popula o empreendimento dentro da unidade
        })
        .lean();
    return reserva;
};



module.exports = {
    createReserva,
    getReservasByCompany,
    getReservaById
};