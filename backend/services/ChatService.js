const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const EvolutionInstance = require('../models/EvolutionInstance');
const axios = require('axios');
const Lead = require('../models/Lead');
const LeadService = require('./LeadService'); // <<< A CORREÇÃO ESTÁ AQUI



/**
 * Corrige números de celular brasileiros que vêm sem o nono dígito.
 * Ex: Converte "558312345678" para "5583912345678".
 * @param {string} phone - O número de telefone (apenas dígitos).
 * @returns {string} O número corrigido ou o original.
 */
const fixBrazilianMobileNumber = (phone) => {
    // Verifica se começa com '55' (Brasil) e tem 12 dígitos (formato sem o '9')
    if (phone.startsWith('55') && phone.length === 12) {
        const ddd = phone.substring(2, 4);
        // DDDs de celular no Brasil vão de 11 a 99.
        if (parseInt(ddd) >= 11) {
            // Insere o '9' após o DDD
            const correctedPhone = phone.slice(0, 4) + '9' + phone.slice(4);
            console.log(`[WebhookSvc] Corrigindo número de telefone: ${phone} -> ${correctedPhone}`);
            return correctedPhone;
        }
    }
    return phone; // Retorna o número original se não corresponder à regra
};


/**
 * Lista todas as conversas de uma empresa, ordenadas pela última mensagem.
 */
/**
 * Lista todas as conversas de uma empresa, ordenadas pela última mensagem.
 */
const listConversations = async (companyId) => {
    console.log(`[ChatService] Buscando conversas para a Company ID: ${companyId}`);
    if (!companyId) {
        console.error("[ChatService] ERRO: companyId não foi fornecido para listConversations.");
        return []; // Retorna um array vazio se o ID da empresa não for passado
    }

    try {
        const conversations = await Conversation.find({ company: companyId })
            .populate({
            path: 'lead',
            select: 'nome fotoUrl situacao', // Pede também a situação
            populate: {
                path: 'situacao',
                model: 'LeadStage',
                select: 'nome'
            }
        })
        .sort({ lastMessageAt: -1 })
        .lean();
        
        console.log(`[ChatService] Encontradas ${conversations.length} conversas.`);
        return conversations;

    } catch (error) {
        console.error("[ChatService] Erro ao buscar conversas:", error);
        throw new Error("Erro interno ao buscar conversas.");
    }
};


/**
 * Busca todas as mensagens de uma conversa específica e zera o contador de não lidas.
 */
const getMessages = async (conversationId, companyId) => {
    const conversation = await Conversation.findOne({ _id: conversationId, company: companyId });
    if (!conversation) {
        throw new Error("Conversa não encontrada.");
    }

    // Zera o contador de não lidas
    if (conversation.unreadCount > 0) {
        conversation.unreadCount = 0;
        await conversation.save();
    }

    return Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).lean();
};

/**
 * Envia uma nova mensagem de texto a partir do CRM.
 */
const sendMessage = async (conversationId, companyId, actorUserId, messageContent) => {
    const conversation = await Conversation.findOne({ _id: conversationId, company: companyId });
    if (!conversation) {
        throw new Error("Conversa não encontrada.");
    }

    const crmInstance = await EvolutionInstance.findOne({ company: companyId, status: 'open' });
    if (!crmInstance) {
        throw new Error("Nenhuma instância do WhatsApp está conectada e pronta para enviar mensagens para esta empresa.");
    }

    try {
        // Usa o JID completo salvo na conversa, que é o que a ferramenta de teste está usando.
        const recipientJid = conversation.channelInternalId;
        if (!recipientJid) {
            throw new Error(`Destinatário (JID) não encontrado na conversa.`);
        }

        console.log(`[ChatService] Enviando mensagem para: ${recipientJid} na instância: ${crmInstance.instanceName}`);


        const payload = {
            number: recipientJid,
            options: {
                delay: 1200,
                presence: "composing"
            },
            text: messageContent
        };

        const response = await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${crmInstance.instanceName}`,
            payload,
            { headers: { 'apikey': crmInstance.apiKey } }
        );

        // --- O resto da lógica para salvar a mensagem no seu banco continua a mesma ---
        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: response.data.key?.id,
            direction: 'outgoing',
            senderId: actorUserId.toString(),
            content: messageContent,
            status: 'sent'
        });
        await newMessage.save();

        conversation.lastMessage = messageContent;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        return newMessage;

    } catch (error) {
        console.error("[ChatService] ERRO DETALHADO da Evolution API:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(error.response?.data?.message || "Falha ao enviar mensagem via Evolution API.");
    }
};


/**
 * Cria um Lead a partir de uma conversa não atribuída.
 * @param {string} conversationId - O ID da conversa "órfã".
 * @param {string} companyId - ID da empresa.
 * @param {string} actorUserId - ID do usuário que está realizando a ação.
 * @returns {Promise<object>} O Lead recém-criado.
 */
const createLeadFromConversation = async (conversationId, companyId, actorUserId) => {
    console.log(`[ChatService] Criando Lead a partir da Conversa ID: ${conversationId}`);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const conversation = await Conversation.findOne({ _id: conversationId, company: companyId, lead: null }).session(session);
        if (!conversation) {
            throw new Error("Conversa não encontrada, já atribuída a um lead ou não pertence a esta empresa.");
        }

        const senderPhone = `+${conversation.channelInternalId.split('@')[0]}`;

        // 1. Monta os dados para o novo Lead
        const leadData = {
            nome: conversation.tempContactName || `Contato WhatsApp ${senderPhone}`,
            contato: fixBrazilianMobileNumber(senderPhone),
            origem: 'WhatsApp' // A origem é definida como WhatsApp
        };

        // 2. Chama o serviço de criação de Lead que já é robusto
        const newLead = await LeadService.createLead(leadData, companyId, actorUserId, { session });
        console.log(`[ChatService] Novo lead criado com ID: ${newLead._id}`);

        // 3. Atualiza a conversa, vinculando-a ao novo lead
        conversation.lead = newLead._id;
        conversation.leadNameSnapshot = newLead.nome;
        conversation.tempContactName = null; // Limpa o nome temporário
        await conversation.save({ session });
        console.log(`[ChatService] Conversa ${conversation._id} vinculada ao Lead ${newLead._id}`);
        
        await session.commitTransaction();
        return newLead;

    } catch (error) {
        await session.abortTransaction();
        console.error(`[ChatService] Erro ao criar lead a partir da conversa ${conversationId}:`, error);
        throw new Error(error.message || "Erro ao criar lead a partir da conversa.");
    } finally {
        session.endSession();
    }
};


module.exports = { listConversations, getMessages, sendMessage, createLeadFromConversation };