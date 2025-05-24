// backend/services/ReservaService.js
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const LeadStage = require('../models/LeadStage'); // Para buscar o ID do estágio "Em Reserva"
const { logHistory } = require('./historyService'); // Para registrar no histórico do Lead

/**
 * Cria uma nova reserva, atualiza o status do Lead e da Unidade.
 * @param {object} reservaData - Dados da reserva (validadeReserva, valorSinal, observacoesReserva).
 * @param {string} leadId - ID do Lead.
 * @param {string} unidadeId - ID da Unidade a ser reservada.
 * @param {string} empreendimentoId - ID do Empreendimento da unidade.
 * @param {string} companyId - ID da Empresa.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando a reserva.
 * @returns {Promise<Reserva>} A reserva criada.
 */
const createReserva = async (reservaData, leadId, unidadeId, empreendimentoId, companyId, creatingUserId) => {
    console.log(`[ReservaService] Iniciando criação de reserva para Lead ${leadId}, Unidade ${unidadeId}, Empresa ${companyId}`);

    // Validações de IDs
    if (!mongoose.Types.ObjectId.isValid(leadId) ||
        !mongoose.Types.ObjectId.isValid(unidadeId) ||
        !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(creatingUserId)) {
        throw new Error("IDs inválidos fornecidos para criar reserva.");
    }

    if (!reservaData.validadeReserva) {
        throw new Error("Data de validade da reserva é obrigatória.");
    }

    // 1. Verificar se o Lead existe, pertence à empresa e não está em um status final (Vendido, Descartado)
    const lead = await Lead.findOne({ _id: leadId, company: companyId });
    if (!lead) {
        throw new Error(`Lead ${leadId} não encontrado ou não pertence à empresa.`);
    }
    // Adicionar verificação de status do lead se necessário (ex: não permitir reservar se já vendido)
    const leadStatusAtual = await LeadStage.findById(lead.situacao).lean();
    if (leadStatusAtual && (leadStatusAtual.nome === "Vendido" || leadStatusAtual.nome === "Descartado")) {
         throw new Error(`Lead ${lead.nome} já está com status ${leadStatusAtual.nome} e não pode ser reservado.`);
    }


    // 2. Verificar se a Unidade existe, pertence ao empreendimento/empresa e está "Disponível"
    const unidade = await Unidade.findOne({
        _id: unidadeId,
        empreendimento: empreendimentoId,
        company: companyId,
        // statusUnidade: "Disponível", // A checagem de statusUnidade já está no pre-save da Reserva e o índice parcial também.
                                       // Mas é bom reconfirmar aqui antes de mudar outros docs.
        ativo: true
    });

    if (!unidade) {
        throw new Error(`Unidade ${unidadeId} não encontrada, não pertence ao empreendimento/empresa ou está inativa.`);
    }
    if (unidade.statusUnidade !== "Disponível") {
        throw new Error(`Unidade ${unidade.identificador} não está Disponível. Status atual: ${unidade.statusUnidade}.`);
    }

    // 3. Encontrar o ID do estágio "Em Reserva" para a empresa
    const situacaoEmReserva = await LeadStage.findOne({
        company: companyId,
        nome: { $regex: new RegExp("^Em Reserva$", "i") } // Case-insensitive
    }).lean();

    if (!situacaoEmReserva) {
        // Opção: Criar o estágio "Em Reserva" se não existir, ou lançar erro.
        // Por agora, vamos lançar erro para que o admin crie o estágio.
        throw new Error(`Estágio de Lead "Em Reserva" não encontrado para a empresa ${companyId}. Por favor, cadastre-o na área de administração.`);
    }

    // 4. Criar o documento Reserva
    const novaReserva = new Reserva({
        ...reservaData, // Contém validadeReserva, valorSinal, observacoesReserva
        lead: leadId,
        unidade: unidadeId,
        empreendimento: empreendimentoId,
        company: companyId,
        createdBy: creatingUserId,
        statusReserva: "Ativa" // Default já é "Ativa", mas explícito aqui.
    });

    // Iniciar uma sessão para transação, se possível/desejado, para garantir atomicidade
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
        const reservaSalva = await novaReserva.save(/*{ session }*/);

        // 5. Atualizar Status do Lead
        const oldLeadStatus = lead.situacao;
        lead.situacao = situacaoEmReserva._id;
        await lead.save(/*{ session }*/);

        // 6. Atualizar Status da Unidade e vincular Lead/Reserva
        unidade.statusUnidade = "Reservada";
        unidade.currentLeadId = leadId;
        unidade.currentReservaId = reservaSalva._id;
        await unidade.save(/*{ session }*/);

        // 7. Registrar no Histórico do Lead
        await logHistory(
            leadId,
            creatingUserId,
            "RESERVA_CRIADA", // Ou um tipo de ação mais específico
            `Reserva para unidade ${unidade.identificador} (Empreendimento: ${reservaData.empreendimentoNome || empreendimentoId}) criada. Status anterior: ${leadStatusAtual?.nome || 'N/A'}. Nova situação: Em Reserva.`,
            { reservaId: reservaSalva._id, unidadeId: unidadeId, oldLeadStatusId: oldLeadStatus, newLeadStatusId: situacaoEmReserva._id }
        );

        // await session.commitTransaction();
        console.log(`[ReservaService] Reserva ${reservaSalva._id} criada com sucesso. Lead ${leadId} e Unidade ${unidadeId} atualizados.`);
        return reservaSalva;

    } catch (error) {
        // await session.abortTransaction();
        console.error("[ReservaService] Erro ao criar reserva e atualizar entidades:", error);
        if (error.code === 11000 && error.message.includes("unidade_statusReserva_ativa_unique_idx")) {
             throw new Error(`A unidade ${unidadeId} já possui uma reserva ativa.`);
        }
        throw new Error(error.message || "Erro ao criar a reserva.");
    } finally {
        // session.endSession();
    }
};


// Futuras funções:
// const getReservaById = async (...) => {};
// const listReservasByLead = async (...) => {};
// const listReservasByEmpreendimento = async (...) => {};
// const updateReservaStatus = async (reservaId, novoStatus, userId) => {}; // Para Cancelar, Expirar, Converter...

module.exports = {
    createReserva
    // ... outras funções
};