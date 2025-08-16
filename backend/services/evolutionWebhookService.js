const Lead = require('../models/Lead');
const EvolutionInstance = require('../models/EvolutionInstance');
const LeadService = require('./LeadService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logHistory } = require('./LeadService');
const origemService = require('./origemService');
const axios = require('axios');

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
    // 1. Extração e Validação Inicial
    const { instance, data } = payload;
    const message = data.message;
    const key = data.key;
    const remoteJid = key?.remoteJid;

    if (!instance || !message || !remoteJid) { return; }

    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) { return; }

    const isGroupMessage = remoteJid.endsWith('@g.us');
    if (isGroupMessage && !crmInstance.receiveFromGroups) {
        console.log(`[WebhookSvc] Mensagem de grupo ignorada.`);
        return;
    }
    
    // 2. Determinar o Tipo e Conteúdo da Mensagem
    let contentType = 'other', content = '[Tipo de mensagem não suportado]', mediaUrl = null, mediaMimeType = null, lastMessagePreview = 'Nova Mídia';
    if (message.conversation) {
        contentType = 'text';
        content = message.conversation;
        lastMessagePreview = content.length > 30 ? content.substring(0, 30) + '...' : content;
    } else if (message.imageMessage) {
        contentType = 'image';
        mediaUrl = message.imageMessage.url;
        mediaMimeType = message.imageMessage.mimetype;
        content = message.imageMessage.caption || 'Imagem';
        lastMessagePreview = '📷 Imagem';
    } else if (message.audioMessage) {
        contentType = 'audio';
        mediaUrl = message.audioMessage.url;
        mediaMimeType = message.audioMessage.mimetype;
        content = 'Áudio';
        lastMessagePreview = '🎤 Áudio';
    } else if (message.documentMessage) {
        contentType = 'document';
        mediaUrl = message.documentMessage.url;
        mediaMimeType = message.documentMessage.mimetype;
        content = message.documentMessage.fileName || 'Documento';
        lastMessagePreview = '📄 Documento';
    } else {
        console.log('[WebhookSvc] Tipo de mensagem não suportado. Ignorando.');
        return;
    }
    
    // 3. Buscar a Foto do Perfil Ativamente
    let contactPhotoUrl = null;
    try {
        const profilePicResponse = await axios.post(`${process.env.EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instance}`, { number: remoteJid }, { headers: { 'apikey': crmInstance.apiKey } });
        if (profilePicResponse.data?.profilePictureUrl) {
            contactPhotoUrl = profilePicResponse.data.profilePictureUrl;
            console.log(`[WebhookSvc] Foto do perfil encontrada para ${remoteJid}.`);
        }
    } catch (picError) {
        console.warn(`[WebhookSvc] Não foi possível buscar a foto do perfil para ${remoteJid}.`);
    }
    
    // 4. Lógica Principal
    const companyId = crmInstance.company;
    const messageDirection = key.fromMe ? 'outgoing' : 'incoming';
    const leadPhoneNumber = fixBrazilianMobileNumber(remoteJid.split('@')[0]);
    const senderPhoneWithPlus = `+${leadPhoneNumber}`;

    try {
        let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });

        if (!lead && !key.fromMe) {
            if (crmInstance.autoCreateLead) {
                const origemDoc = await origemService.findOrCreateOrigem({ nome: 'WhatsApp' }, companyId);
                const leadData = {
                    nome: data.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
                    contato: senderPhoneWithPlus,
                    origem: origemDoc._id,
                };
                lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
            }
        }
        
        // 5. ATUALIZAÇÃO ÚNICA E ATÔMICA DA CONVERSA
        const findQuery = lead ? { lead: lead._id, channel: 'WhatsApp' } : { company: companyId, channelInternalId: remoteJid, lead: null };
        
        const updatePayload = {
            $set: {
                company: companyId,
                channelInternalId: remoteJid,
                lastMessage: lastMessagePreview,
                lastMessageAt: new Date(),
                contactPhotoUrl: contactPhotoUrl,
                instanceName: instance,
                ...(lead && { leadNameSnapshot: lead.nome }),
                ...(!lead && { tempContactName: data.pushName || `Contato ${senderPhoneWithPlus}` })
            },
            ...(messageDirection === 'incoming' && { $inc: { unreadCount: 1 } })
        };
        
        const conversation = await Conversation.findOneAndUpdate(findQuery, updatePayload, { upsert: true, new: true });

        if (!conversation) {
            console.error(`[WebhookSvc] CRÍTICO: Não foi possível encontrar ou criar conversa para ${senderPhoneWithPlus}`);
            return;
        }

        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: key.id,
            direction: messageDirection,
            senderId: key.fromMe ? (crmInstance.ownerNumber || 'CRM_USER') : remoteJid,
            contentType, content, mediaUrl, mediaMimeType
        });
        await newMessage.save();

        console.log(`[WebhookSvc] Mensagem (direção: ${messageDirection}, tipo: ${contentType}) salva para a Conversa ID: ${conversation._id}`);
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
    getQrCodeFromCache,
    fixBrazilianMobileNumber
};