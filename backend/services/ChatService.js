const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const EvolutionInstance = require('../models/EvolutionInstance');
const axios = require('axios');

/**
 * Lista todas as conversas de uma empresa, ordenadas pela última mensagem.
 */
const listConversations = async (companyId) => {
    return Conversation.find({ company: companyId })
        .populate('lead', 'nome') // Puxa o nome do lead para exibir na lista
        .sort({ lastMessageAt: -1 })
        .lean();
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
    const conversation = await Conversation.findOne({ _id: conversationId, company: companyId }).populate('lead');
    if (!conversation) {
        throw new Error("Conversa não encontrada.");
    }

    const crmInstance = await EvolutionInstance.findOne({ company: companyId, status: 'open' });
    if (!crmInstance) {
        throw new Error("Nenhuma instância do WhatsApp está conectada e pronta para enviar mensagens para esta empresa.");
    }
        
    // Pega o JID completo da conversa (ex: 5583...@s.whatsapp.net)
    const recipientJid = conversation.channelInternalId;

    // A Evolution API espera que o campo 'number' seja apenas os dígitos antes do '@'
    const recipientNumber = recipientJid.split('@')[0];

    if (!recipientNumber) {
        throw new Error(`Destinatário inválido na conversa: ${recipientJid}`);
    }

    try {
        // 1. Enviar mensagem via Evolution API
        console.log(`[ChatService] Enviando mensagem para: ${recipientNumber} na instância: ${crmInstance.instanceName}`);
        const response = await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${crmInstance.instanceName}`,
            {
                number: recipientNumber,
                textMessage: { text: messageContent }
            },
            { headers: { 'apikey': crmInstance.apiKey } }
        );
        
        // 2. Salvar a mensagem enviada no nosso banco de dados
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

        // 3. Atualizar a "última mensagem" da conversa
        conversation.lastMessage = messageContent;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        return newMessage;

    } catch (error) {
        console.error("[ChatService] Erro ao enviar mensagem via Evolution API:", error.response?.data || error.message);
        // Retorna a mensagem de erro específica da Evolution API, se disponível
        throw new Error(error.response?.data?.message || "Falha ao enviar mensagem via Evolution API.");
    }
};

module.exports = { listConversations, getMessages, sendMessage };