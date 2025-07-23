const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService'); // Ou o caminho correto para seu historyService

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
 * Processa o evento 'messages.upsert' (nova mensagem recebida) do webhook da Evolution API.
 * @param {object} payload - O corpo do webhook.
 */
const processMessageUpsert = async (payload) => {
    const { instance, data } = payload;
    const message = data.message;
    const remoteJid = data.key?.remoteJid;

    if (!instance || !message || !remoteJid || !message.conversation) {
        console.log('[WebhookSvc] Evento "messages.upsert" ignorado: dados essenciais ou texto da mensagem ausentes.');
        return;
    }

    const isGroupMessage = remoteJid.endsWith('@g.us');
    
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) {
        console.log(`[WebhookSvc] Instância '${instance}' não encontrada no CRM. Mensagem ignorada.`);
        return;
    }

    if (isGroupMessage && !crmInstance.receiveFromGroups) {
        console.log(`[WebhookSvc] Mensagem do grupo '${remoteJid}' ignorada para a instância '${instance}' conforme configuração.`);
        return;
    }

    let senderPhone = remoteJid.split('@')[0];
    senderPhone = fixBrazilianMobileNumber(senderPhone); // Corrige o número se necessário
    const senderPhoneWithPlus = `+${senderPhone}`;
    const companyId = crmInstance.company;
    
    try {
        // 1. Encontra ou Cria o Lead
        let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });

        if (!lead) {
            console.log(`[WebhookSvc] Nenhum lead encontrado para ${senderPhoneWithPlus}. Criando um novo...`);
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
                contato: senderPhoneWithPlus, // Envia o número já corrigido e com '+'
                origem: 'WhatsApp', // Garanta que você tem uma Origem com este nome
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

        console.log(`[WebhookSvc] Mensagem de ${senderPhoneWithPlus} salva para a Conversa ID: ${conversation._id}`);

    } catch (error) {
        console.error(`[WebhookSvc] Erro ao processar mensagem para ${senderPhoneWithPlus}:`, error.message);
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