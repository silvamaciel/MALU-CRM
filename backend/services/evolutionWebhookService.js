const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService'); // Ou o caminho correto do seu historyService

/**
 * Corrige números de celular brasileiros que vêm sem o nono dígito.
 * Ex: Converte "558312345678" para "5583912345678".
 * @param {string} phone - O número de telefone (apenas dígitos).
 * @returns {string} O número corrigido ou o original.
 */
const fixBrazilianMobileNumber = (phone) => {
    if (phone.startsWith('55') && phone.length === 12) {
        const ddd = phone.substring(2, 4);
        if (parseInt(ddd) >= 11) {
            const correctedPhone = phone.slice(0, 4) + '9' + phone.slice(4);
            console.log(`[WebhookSvc] Corrigindo número de telefone: ${phone} -> ${correctedPhone}`);
            return correctedPhone;
        }
    }
    return phone;
};


/**
 * Processa o evento 'messages.upsert' (nova mensagem recebida) do webhook da Evolution API.
 * @param {object} payload - O corpo do webhook.
 */
const processMessageUpsert = async (payload) => {
    // 1. Extração e Validação Inicial dos Dados do Webhook
    const { instance, data } = payload;
    const message = data.message;
    const remoteJid = data.key?.remoteJid;

    // Ignora eventos que não são mensagens de texto de um usuário (ex: atualizações de status, chamadas)
    if (!instance || !message || !remoteJid || !message.conversation) {
        console.log('[WebhookSvc] Evento "messages.upsert" ignorado: não é uma mensagem de texto válida.');
        return;
    }

    // 2. Verifica a Configuração da Instância (se aceita mensagens de grupo)
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

    // 3. Formatação dos Dados do Remetente
    let senderPhone = remoteJid.split('@')[0];
    senderPhone = fixBrazilianMobileNumber(senderPhone); // Corrige o número se necessário
    const senderPhoneWithPlus = `+${senderPhone}`;
    const companyId = crmInstance.company;
    
    try {
        // 4. Lógica Principal: Encontrar ou Criar o Lead
        let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });

        if (!lead) {
            // Se o lead não existe, cria um novo
            console.log(`[WebhookSvc] Nenhum lead encontrado para ${senderPhoneWithPlus}. Criando um novo...`);
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
                contato: senderPhoneWithPlus,
                origem: 'WhatsApp', // Garanta que você tem uma Origem com este nome
            };
            
            // Reutiliza a sua função createLead, que já tem todas as validações de duplicados, etc.
            lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}) via WhatsApp.`);
        } else {
            console.log(`[WebhookSvc] Lead existente (ID: ${lead._id}) encontrado para o número ${senderPhoneWithPlus}.`);
        }
        
        // 5. Encontra ou Cria a Conversa
        const conversation = await Conversation.findOneAndUpdate(
            { lead: lead._id, channel: 'WhatsApp' },
            { 
                $set: {
                    company: companyId,
                    channelInternalId: remoteJid,
                    lastMessage: message.conversation,
                    lastMessageAt: new Date()
                },
                $inc: { unreadCount: 1 } // Incrementa o contador de mensagens não lidas
            },
            { upsert: true, new: true } // Cria a conversa se não existir
        );

        // 6. Salva a Mensagem no Histórico do Banco de Dados
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

        console.log(`[WebhookSvc] Mensagem de ${senderPhoneWithPlus} salva com sucesso para a Conversa ID: ${conversation._id}`);

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
    const newStatus = data.state;

    if (!instance || !newStatus) {
        console.log('[WebhookSvc] Evento "connection.update" ignorado: dados essenciais ausentes.');
        return;
    }
    
    console.log(`[WebhookSvc] Recebido connection.update para instância '${instance}'. Novo status: ${newStatus}`);

    try {
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