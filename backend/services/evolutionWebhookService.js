const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService');
const origemService = require('./origemService');

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
        return;
    }

    const isGroupMessage = remoteJid.endsWith('@g.us');
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) return;

    if (isGroupMessage && !crmInstance.receiveFromGroups) {
        console.log(`[WebhookSvc] Mensagem de grupo ignorada para a instância '${instance}'.`);
        return;
    }

    let senderPhone = remoteJid.split('@')[0];
    senderPhone = fixBrazilianMobileNumber(senderPhone);
    const senderPhoneWithPlus = `+${senderPhone}`;
    const companyId = crmInstance.company;
    
    try {
        let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });

        if (!lead) {
            console.log(`[WebhookSvc] Nenhum lead encontrado para ${senderPhoneWithPlus}. Criando um novo...`);
            
            // VVVVV LÓGICA ATUALIZADA AQUI VVVVV
            // 1. Encontra ou cria a Origem "WhatsApp" e pega o seu ID
            const origemDoc = await origemService.findOrCreateOrigem(
                { nome: 'WhatsApp', descricao: 'Lead recebido via WhatsApp (Evolution API)' }, 
                companyId
            );

            // 2. Monta o leadData com o ID da origem
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
                contato: senderPhoneWithPlus,
                origem: origemDoc._id, // <<< PASSA O ObjectId DA ORIGEM
            };
            
            // 3. Chama a createLead, que agora recebe o ID que ela espera
            lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}) via WhatsApp.`);
            // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        }
        
        // --- A lógica para criar a Conversa e a Mensagem continua a mesma ---
        const conversation = await Conversation.findOneAndUpdate(
            { lead: lead._id, channel: 'WhatsApp' },
            { 
                $set: { company: companyId, lastMessage: message.conversation, lastMessageAt: new Date() },
                $inc: { unreadCount: 1 }
            },
            { upsert: true, new: true }
        );

        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: data.key.id,
            direction: 'incoming',
            senderId: remoteJid,
            content: message.conversation,
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

    try {
        // Busca a instância no nosso banco de dados pelo nome que veio no webhook
        const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
        
        if (!crmInstance) {
            console.log(`[WebhookSvc] Instância '${instance}' não encontrada no CRM. Status não atualizado.`);
            return;
        }

        crmInstance.status = newStatus;
        await crmInstance.save();
        
        console.log(`[WebhookSvc] Status da instância '${instance}' atualizado para '${newStatus}' no CRM com sucesso.`);

    } catch (error) {
        console.error(`[WebhookSvc] ERRO ao tentar atualizar o status da instância '${instance}':`, error);
    }
};



module.exports = {
    processMessageUpsert,
    processConnectionUpdate
};