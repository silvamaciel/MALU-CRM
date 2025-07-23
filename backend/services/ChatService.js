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
    if (!conversation || !conversation.lead) {
        throw new Error("Conversa ou Lead associado não encontrado.");
    }

    // Encontra uma instância do WhatsApp conectada para esta empresa
    const crmInstance = await EvolutionInstance.findOne({ company: companyId, status: 'open' });
    if (!crmInstance) {
        throw new Error("Nenhuma instância do WhatsApp está conectada e pronta para enviar mensagens para esta empresa.");
    }
    
    // 1. Enviar a mensagem via Evolution API
    const response = await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${crmInstance.instanceName}`,
        {
            number: conversation.lead.contato.replace('+', ''), // Número do lead sem o '+'
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
        senderId: actorUserId.toString(), // ID do usuário do CRM que enviou
        content: messageContent,
        status: 'sent'
    });
    await newMessage.save();

    // 3. Atualizar a "última mensagem" da conversa
    conversation.lastMessage = messageContent;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return newMessage;
};

module.exports = { listConversations, getMessages, sendMessage };