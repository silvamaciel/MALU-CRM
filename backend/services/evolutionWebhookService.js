const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService');
const origemService = require('./origemService');

const qrCodeCache = new Map();


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
    const key = data.key;
    const remoteJid = key?.remoteJid;

    if (!instance || !message || !remoteJid || !message.conversation) return;

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

    if (key.fromMe) {
        messageDirection = 'outgoing';
        leadPhoneNumber = remoteJid.split('@')[0];
        senderIdentifier = crmInstance.ownerNumber || 'CRM_USER';
    } else {
        messageDirection = 'incoming';
        leadPhoneNumber = remoteJid.split('@')[0];
        senderIdentifier = remoteJid;
    }

    leadPhoneNumber = fixBrazilianMobileNumber(leadPhoneNumber);
    const leadPhoneNumberWithPlus = `+${leadPhoneNumber}`;

    try {
        let lead = await Lead.findOne({ contato: leadPhoneNumberWithPlus, company: companyId });

        if (!lead) {
            if (key.fromMe) {
                console.log(`[WebhookSvc] Mensagem enviada para um número desconhecido (${leadPhoneNumberWithPlus}). Lead não será criado.`);
                return;
            }

            console.log(`[WebhookSvc] Nenhum lead encontrado para ${leadPhoneNumberWithPlus}. Criando um novo...`);
            const origemDoc = await origemService.findOrCreateOrigem(
                {
                    nome: 'WhatsApp',
                    descricao: 'Lead recebido via WhatsApp (Evolution API)'
                },
                companyId
            );
            const leadData = {
                nome: data.pushName || `Contato WhatsApp ${leadPhoneNumberWithPlus}`,
                contato: leadPhoneNumberWithPlus,
                origem: origemDoc._id,
            };
            lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}).`);
        }

        const conversation = await Conversation.findOneAndUpdate(
            { lead: lead._id, channel: 'WhatsApp' },
            {
                $set: {
                    company: companyId,
                    channelInternalId: remoteJid,
                    lastMessage: message.conversation,
                    lastMessageAt: new Date()
                },
                ...(messageDirection === 'incoming' && { $inc: { unreadCount: 1 } })
            },
            { upsert: true, new: true }
        );

        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: key.id,
            direction: messageDirection,
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


/**
 * Processa o evento 'qrcode.updated' e armazena o QR Code no cache temporário.
 * @param {object} payload - O corpo do webhook.
 */
const processQrCodeUpdate = async (payload) => {
    const { instance, data } = payload;
    const qrCodeBase64 = data.qrcode?.base64;
    
    if (instance && qrCodeBase64) {
        console.log(`[WebhookSvc] QR Code recebido para a instância '${instance}'. Armazenando no cache.`);
        // Armazena o QR Code associado ao nome da instância por 60 segundos
        qrCodeCache.set(instance, qrCodeBase64);
        setTimeout(() => qrCodeCache.delete(instance), 60000); // Limpa o cache após 1 minuto
    }
};

/**
 * Permite que o frontend busque um QR Code que foi armazenado no cache.
 * @param {string} instanceName - O nome da instância.
 * @returns {Promise<object>} Um objeto com o QR Code ou nulo.
 */
const getQrCodeFromCache = async (instanceName) => {
    const qrcode = qrCodeCache.get(instanceName);
    if (qrcode) {
        console.log(`[WebhookSvc] QR Code encontrado no cache para '${instanceName}' e entregue.`);
        qrCodeCache.delete(instanceName); // Remove o QR Code após ser entregue para evitar reutilização
        return { qrcode };
    }
    console.log(`[WebhookSvc] Nenhum QR Code no cache para '${instanceName}'. Aguardando webhook...`);
    return { qrcode: null };
};


module.exports = {
    processMessageUpsert,
    processConnectionUpdate,
    processQrCodeUpdate,
    getQrCodeFromCache
};