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
    // 1. Extração de Dados do Webhook
    const { instance, data } = payload;
    const message = data.message;
    const key = data.key;
    const remoteJid = key?.remoteJid; // Este é o JID do chat (a outra pessoa ou grupo)

    if (!instance || !message || !remoteJid || !message.conversation) {
        return; // Ignora eventos que não são mensagens de texto
    }

    // 2. Verifica a Configuração da Instância
    const isGroupMessage = remoteJid.endsWith('@g.us');
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) return;

    if (isGroupMessage && !crmInstance.receiveFromGroups) {
        console.log(`[WebhookSvc] Mensagem de grupo ignorada para a instância '${instance}'.`);
        return;
    }

    const companyId = crmInstance.company;
    let leadPhoneNumber;
    let messageDirection;
    let senderIdentifier;

    // 3. Determina a Direção da Mensagem e o Número do Lead
    if (key.fromMe) {
        // MENSAGEM ENVIADA POR NÓS (outgoing)
        messageDirection = 'outgoing';
        leadPhoneNumber = remoteJid.split('@')[0]; // O destinatário (remoteJid) é o lead
        senderIdentifier = crmInstance.ownerNumber || 'CRM_USER'; // O remetente somos nós
    } else {
        // MENSAGEM RECEBIDA DE UM LEAD (incoming)
        messageDirection = 'incoming';
        leadPhoneNumber = remoteJid.split('@')[0]; // O remetente (remoteJid) é o lead
        senderIdentifier = remoteJid;
    }

    // 4. Formatação e Correção do Número do Lead
    leadPhoneNumber = fixBrazilianMobileNumber(leadPhoneNumber);
    const leadPhoneNumberWithPlus = `+${leadPhoneNumber}`;

    try {
        // 5. Encontra o Lead (ou cria, se for uma mensagem recebida de um número novo)
        let lead = await Lead.findOne({ contato: leadPhoneNumberWithPlus, company: companyId });

        if (!lead) {
            if (key.fromMe) {
                // Se a mensagem foi enviada por nós para um número que não é um lead, não fazemos nada.
                console.log(`[WebhookSvc] Mensagem enviada para um número desconhecido (${leadPhoneNumberWithPlus}). Lead não será criado.`);
                return;
            }
            // Se a mensagem foi recebida de um número novo, criamos o lead.
            console.log(`[WebhookSvc] Nenhum lead encontrado para ${leadPhoneNumberWithPlus}. Criando um novo...`);
            const origemDoc = await origemService.findOrCreateOrigem({ nome: 'WhatsApp' }, companyId);
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${leadPhoneNumberWithPlus}`,
                contato: leadPhoneNumberWithPlus,
                origem: origemDoc._id,
            };
            lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}).`);
        }
        
        // 6. Encontra ou Cria a Conversa
        const conversation = await Conversation.findOneAndUpdate(
            { lead: lead._id, channel: 'WhatsApp' },
            { 
                $set: {
                    company: companyId,
                    channelInternalId: remoteJid,
                    lastMessage: message.conversation,
                    lastMessageAt: new Date()
                },
                // Só incrementa o contador de não lidas se a mensagem for recebida
                ...(messageDirection === 'incoming' && { $inc: { unreadCount: 1 } })
            },
            { upsert: true, new: true }
        );

        // 7. Salva a Mensagem no Histórico com a Direção Correta
        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: key.id,
            direction: messageDirection, // <<< USA A DIREÇÃO CORRETA
            senderId: senderIdentifier,
            content: message.conversation,
        });
        await newMessage.save();

        console.log(`[WebhookSvc] Mensagem (direção: ${messageDirection}) salva para a Conversa ID: ${conversation._id}`);

    } catch (error) {
        console.error(`[WebhookSvc] Erro ao processar mensagem para ${leadPhoneNumberWithPlus}:`, error.message);
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