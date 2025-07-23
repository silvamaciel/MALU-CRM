const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService'); // Ou o caminho correto do seu historyService

/**
 * Processa o evento 'messages.upsert' (nova mensagem recebida) do webhook da Evolution API.
 * @param {object} payload - O corpo do webhook.
 */
const processMessageUpsert = async (payload) => {
    const { instance, data } = payload;
    const message = data.message;
    const remoteJid = data.key?.remoteJid;

    // Ignora mensagens sem conteúdo de texto, de status, etc.
    if (!instance || !message || !remoteJid || !message.conversation) {
        console.log('[WebhookSvc] Evento "messages.upsert" ignorado: dados essenciais ou texto da mensagem ausentes.');
        return;
    }

    const isGroupMessage = remoteJid.endsWith('@g.us');
    
    // Busca a configuração da instância no nosso banco de dados
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) {
        console.log(`[WebhookSvc] Instância '${instance}' não encontrada no CRM. Mensagem ignorada.`);
        return;
    }

    // Aplica a regra de negócio para ignorar mensagens de grupo
    if (isGroupMessage && !crmInstance.receiveFromGroups) {
        console.log(`[WebhookSvc] Mensagem do grupo '${remoteJid}' ignorada para a instância '${instance}' conforme configuração.`);
        return;
    }

    const senderPhone = `+${remoteJid.split('@')[0]}`;
    const companyId = crmInstance.company;
    
    try {
        // 1. Encontra ou Cria o Lead
        let lead = await Lead.findOne({ contato: senderPhone, company: companyId });

        if (!lead) {
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${senderPhone}`,
                contato: senderPhone,
                origem: 'WhatsApp', // Você precisa ter uma origem "WhatsApp" ou adaptar a createLead
            };
            lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}) via WhatsApp.`);
        }
        
        // 2. Encontra ou Cria a Conversa
        const conversation = await Conversation.findOneAndUpdate(
            { lead: lead._id, channel: 'WhatsApp' },
            { 
                $set: {
                    company: companyId,
                    channelInternalId: remoteJid,
                    lastMessage: message.conversation,
                    lastMessageAt: new Date()
                },
                $inc: { unreadCount: 1 }
            },
            { upsert: true, new: true }
        );

        // 3. Salva a Mensagem no banco de dados do CRM
        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: data.key.id,
            direction: 'incoming',
            senderId: remoteJid,
            content: message.conversation,
            status: 'delivered'
        });
        await newMessage.save();

        console.log(`[WebhookSvc] Mensagem de ${senderPhone} salva para a Conversa ID: ${conversation._id}`);

    } catch (error) {
        console.error(`[WebhookSvc] Erro ao processar mensagem para ${senderPhone}:`, error.message);
    }
};

/**
 * Processa o evento 'connection.update' recebido do webhook.
 * @param {object} payload - O corpo do webhook.
 */
const processConnectionUpdate = async (payload) => {
    const { instance, data } = payload;
    const newStatus = data.state; // 'open' (conectado), 'close' (desconectado)

    if (!instance || !newStatus) {
        console.log('[WebhookSvc] Evento "connection.update" ignorado: dados essenciais ausentes.');
        return;
    }
    
    console.log(`[WebhookSvc] Recebido connection.update para instância '${instance}'. Novo status: ${newStatus}`);

    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) {
        console.log(`[WebhookSvc] Instância '${instance}' não encontrada no CRM. Status não atualizado.`);
        return;
    }

    crmInstance.status = newStatus;
    await crmInstance.save();
    
    console.log(`[WebhookSvc] Status da instância '${instance}' atualizado para '${newStatus}' no CRM.`);
};


module.exports = {
    processMessageUpsert,
    processConnectionUpdate
};