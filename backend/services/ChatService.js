const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const EvolutionInstance = require('../models/EvolutionInstance');
const axios = require('axios');
const Lead = require('../models/Lead');

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

module.exports = { listConversations, getMessages, sendMessage };