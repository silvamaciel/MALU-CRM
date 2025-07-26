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

    const { instance, data } = payload;
    const message = data.message;
    const key = data.key;
    const remoteJid = key?.remoteJid;

    if (!instance || !message || !remoteJid || !message.conversation) return;



    const isGroupMessage = remoteJid.endsWith('@g.us');
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) return;


    let contactPhotoUrl = null;
    try {
        // --- 1. Busca a foto do perfil do contato ---
        console.log(`[WebhookSvc] Buscando foto do perfil para ${remoteJid}...`);
        
        const requestUrl = `${process.env.EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instance}`;
        const requestBody = { number: remoteJid };
        const requestHeaders = { headers: { 'apikey': crmInstance.apiKey } };

        // VVVVV LOG DE DEPURAÇÃO ADICIONADO ANTES DA CHAMADA VVVVV
        console.log(`[WebhookSvc DEBUG] Enviando POST para: ${requestUrl}`);
        console.log(`[WebhookSvc DEBUG] Com Body:`, JSON.stringify(requestBody, null, 2));
        console.log(`[WebhookSvc DEBUG] Com Headers: { apikey: "${crmInstance.apiKey.substring(0, 5)}..." }`);
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        const profilePicResponse = await axios.post(requestUrl, requestBody, requestHeaders);

         console.log("[WebhookSvc DEBUG] Resposta completa da API de foto de perfil:", profilePicResponse.data);
        
        if (profilePicResponse.data && profilePicResponse.data.profilePictureUrl) {
            contactPhotoUrl = profilePicResponse.data.profilePictureUrl;
            console.log(`[WebhookSvc] Foto do perfil encontrada para ${remoteJid},`);
        }
    } catch (picError) {
        // VVVVV LOG DE ERRO DETALHADO VVVVV
        console.error(`[WebhookSvc] ERRO DETALHADO ao buscar foto do perfil:`);
        if (picError.response) {
            // O servidor respondeu com um status de erro (4xx, 5xx)
            console.error("  - DADOS DO ERRO:", JSON.stringify(picError.response.data, null, 2));
            console.error("  - STATUS DO ERRO:", picError.response.status);
        } else if (picError.request) {
            // A requisição foi feita mas nenhuma resposta foi recebida
            console.error("  - ERRO DE REQUISIÇÃO: Nenhuma resposta recebida.");
        } else {
            // Algo aconteceu ao configurar a requisição
            console.error('  - ERRO DE CONFIGURAÇÃO:', picError.message);
        }
        console.warn(`[WebhookSvc] Não foi possível buscar a foto do perfil para ${remoteJid}.`);
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    }




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
    const senderPhoneWithPlus = `+${leadPhoneNumber}`;


    try {
        let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });
        let conversation;

        if (!lead) {
            if (crmInstance.autoCreateLead) {
                console.log(`[WebhookSvc] Nenhum lead encontrado para ${senderPhoneWithPlus}. Criando um novo...`);

                const origemDoc = await origemService.findOrCreateOrigem(
                    {
                        nome: 'WhatsApp',
                        descricao: 'Lead recebido via WhatsApp (Evolution API)'
                    },
                    companyId
                );

                const leadData = {
                    nome: data.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
                    contato: senderPhoneWithPlus,
                    origem: origemDoc._id,
                };

                lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
                console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}).`);
            } else {
                console.log(`[WebhookSvc] Criação automática de lead está DESATIVADA para a instância '${instance}'. Salvando conversa como não atribuída.`);

                conversation = await Conversation.findOneAndUpdate(
                    { company: companyId, channelInternalId: remoteJid, lead: null },
                    { $set: { tempContactName: data.pushName || `Contato ${senderPhoneWithPlus}` } },
                    { upsert: true, new: true }
                );
            }
        }

        // Caso o lead exista ou tenha sido criado, cria ou atualiza a conversa vinculada
        if (lead) {
            conversation = await Conversation.findOneAndUpdate(
                { lead: lead._id, channel: 'WhatsApp' },
                {
                    $set: {
                        company: companyId,
                        channelInternalId: remoteJid,
                        leadNameSnapshot: lead.nome,
                        instanceName: instance,
                        contactPhotoUrl: contactPhotoUrl
                    }
                },
                { upsert: true, new: true }
            );
        }

        if (!conversation) {
            console.error(`[WebhookSvc] Não foi possível encontrar ou criar uma conversa para ${senderPhoneWithPlus}`);
            return;
        }

        // Atualiza a conversa com a última mensagem e contador de não lidas
        conversation.lastMessage = message.conversation;
        conversation.lastMessageAt = new Date();
        if (messageDirection === 'incoming') {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        await conversation.save();

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
    getQrCodeFromCache
};