// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');

/**
 * Cria uma nova reserva, atualiza o status do Lead e da Unidade.
 * @param {object} reservaData - Dados da reserva (ex: { validadeReserva, valorSinal, observacoesReserva }).
 * @param {string} leadId - ID do Lead.
 * @param {string} unidadeId - ID da Unidade a ser reservada.
 * @param {string} empreendimentoId - ID do Empreendimento da unidade.
 * @param {string} companyId - ID da Empresa.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando a reserva.
 * @returns {Promise<Reserva>} A reserva criada.
 */
const createReserva = async (reservaData, leadId, unidadeId, empreendimentoId, companyId, creatingUserId) => {
    console.log(`[ReservaService] Iniciando criação de reserva para Lead ${leadId}, Unidade ${unidadeId} (Emp: ${empreendimentoId}), Company ${companyId} por User ${creatingUserId}`);

    // Validações de IDs
    const idsToValidate = { leadId, unidadeId, empreendimentoId, companyId, creatingUserId };
    for (const key in idsToValidate) {
        if (!idsToValidate[key] || !mongoose.Types.ObjectId.isValid(idsToValidate[key])) {
            throw new Error(`ID inválido fornecido para ${key} ao criar reserva.`);
        }
    }

    if (!reservaData || !reservaData.validadeReserva) {
        throw new Error("Dados da reserva incompletos. A Data de Validade da Reserva é obrigatória.");
    }
    const validadeReservaDate = new Date(reservaData.validadeReserva);
    if (isNaN(validadeReservaDate.getTime()) || validadeReservaDate <= new Date()) {
        throw new Error("Data de Validade da Reserva inválida ou anterior à data atual.");
    }

    const nomeEstagioReserva = "Em Reserva"; // Nome padrão


    // Iniciar uma sessão para transação (IMPORTANTE para garantir atomicidade)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verificar o Lead
        const lead = await Lead.findOne({ _id: leadId, company: companyId }).session(session);
        if (!lead) {
            throw new Error(`Lead ${leadId} não encontrado ou não pertence à empresa.`);
        }
        const leadStatusAtualDoc = await LeadStage.findById(lead.situacao).lean(); // Não precisa de session para leitura simples
        const leadStatusAtualNome = leadStatusAtualDoc?.nome || 'N/A';
        if (leadStatusAtualNome === "Vendido" || leadStatusAtualNome === "Descartado") {
             throw new Error(`Lead ${lead.nome} já está com status ${leadStatusAtualNome} e não pode ter nova reserva.`);
        }
        if (lead.unidadeInteresse && !lead.unidadeInteresse.equals(unidadeId) && leadStatusAtualNome === "Em Reserva") {
            // Se já tem uma reserva ativa para outra unidade, pode ser necessário um tratamento especial
            // Por ora, permitimos, mas isso pode ser uma regra de negócio a ser revista.
            console.warn(`[ReservaService] Lead ${leadId} já está "Em Reserva", mas para uma unidade diferente. Prosseguindo com nova reserva.`);
        }


        // 2. Verificar a Unidade e o Empreendimento
        const unidade = await Unidade.findOne({
            _id: unidadeId,
            empreendimento: empreendimentoId,
            company: companyId,
            ativo: true
        }).session(session);

        if (!unidade) {
            throw new Error(`Unidade ${unidadeId} não encontrada, inativa, ou não pertence ao empreendimento/empresa especificado.`);
        }
        if (unidade.statusUnidade !== "Disponível") {
            throw new Error(`A Unidade ${unidade.identificador} não está Disponível. Status atual: ${unidade.statusUnidade}.`);
        }
        
        const empreendimento = await Empreendimento.findById(empreendimentoId).select('nome').lean(); // Não precisa de session
        if (!empreendimento) {
            throw new Error(`Empreendimento ${empreendimentoId} não encontrado.`);
        }


        // 3. Encontrar o ID do estágio "Em Reserva"
        const situacaoEmReserva = await LeadStage.findOne({
            company: companyId,
            nome: { $regex: new RegExp("^Em Reserva$", "i") }
        }).select('_id').lean(); // Não precisa de session

        if (!situacaoEmReserva) {
        console.log(`[ReservaService] Estágio '${nomeEstagioReserva}' não encontrado para Company ${companyId}. Criando...`);
        try {
            // Precisamos do modelo não-lean para criar um novo estágio se formos usar um serviço
            // ou criamos diretamente com o modelo LeadStage.
            const novoEstagio = new LeadStage({
                nome: nomeEstagioReserva,
                descricao: "Lead com unidade de empreendimento reservada.",
                company: companyId,
                ativo: true,
            });
            situacaoEmReserva = await novoEstagio.save(); // Salva e retorna o documento completo
            console.log(`[ReservaService] Estágio '${nomeEstagioReserva}' criado com ID: ${situacaoEmReserva._id}`);
            situacaoEmReserva = situacaoEmReserva.toObject(); 
        } catch (stageCreationError) {
            console.error(`[ReservaService] Falha crítica ao tentar criar estágio padrão '${nomeEstagioReserva}' para Company ${companyId}:`, stageCreationError);
            throw new Error(`Falha ao criar/encontrar estágio de lead '${nomeEstagioReserva}'. Verifique as configurações de estágios ou tente novamente.`);
        }
    }

        // 4. Criar o documento Reserva
        const novaReserva = new Reserva({
            lead: leadId,
            unidade: unidadeId,
            empreendimento: empreendimentoId,
            company: companyId,
            createdBy: creatingUserId,
            dataReserva: reservaData.dataReserva || new Date(), // Default se não vier
            validadeReserva: validadeReservaDate,
            valorSinal: reservaData.valorSinal || null,
            observacoesReserva: reservaData.observacoesReserva || null,
            statusReserva: "Ativa"
        });
        const reservaSalva = await novaReserva.save({ session });

        // 5. Atualizar Status do Lead
        const oldLeadStatusId = lead.situacao;
        lead.situacao = situacaoEmReserva._id;
        lead.unidadeInteresse = unidadeId; // Atualiza a unidade de interesse principal do lead
        await lead.save({ session });

        // 6. Atualizar Status da Unidade e vincular Lead/Reserva
        unidade.statusUnidade = "Reservada";
        unidade.currentLeadId = leadId;
        unidade.currentReservaId = reservaSalva._id;
        await unidade.save({ session });

        // 7. Registrar no Histórico do Lead
        await logHistory(
            leadId,
            creatingUserId,
            "RESERVA_CRIADA",
            `Unidade ${unidade.identificador} (Empreendimento: ${empreendimento.nome}) reservada. Validade: ${validadeReservaDate.toLocaleDateString('pt-BR')}. Situação anterior do lead: ${leadStatusAtualNome}.`,
            { reservaId: reservaSalva._id, unidadeId: unidadeId, oldLeadStatusId: oldLeadStatusId, newLeadStatusId: situacaoEmReserva._id },
            // A sessão não é automaticamente propagada para o logHistory, a menos que o modelo History também seja parte da transação.
            // Para simplificar, o logHistory pode rodar fora da transação ou ser adaptado.
            // Por agora, rodará após o commit se a transação for bem-sucedida.
        );

        await session.commitTransaction();
        console.log(`[ReservaService] Reserva ${reservaSalva._id} criada. Lead ${leadId} e Unidade ${unidadeId} atualizados.`);
        return reservaSalva;

    } catch (error) {
        await session.abortTransaction();
        console.error("[ReservaService] Erro ao criar reserva:", error);
        if (error.code === 11000 && error.message.includes("unidade_statusReserva_ativa_unique_idx")) {
             throw new Error(`A unidade ${unidadeId} já possui uma reserva ativa.`);
        }
        throw new Error(error.message || "Erro interno ao criar a reserva.");
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