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
 * Somente trata mensagens de TEXTO. Não cria Lead em mensagens outgoing.
 * - Outgoing (fromMe: true) sem lead: cria/atualiza Conversation órfã (lead: null).
 * - Incoming sem lead: cria lead (se permitido) e reatribui a Conversation órfã ao novo lead.
 */
const processMessageUpsert = async (payload) => {
  try {
    const { instance, data } = payload || {};
    const message = data?.message;
    const key = data?.key;
    const remoteJid = key?.remoteJid;

    // Guarda inicial (suporta apenas TEXTO)
    if (!instance || !message || !remoteJid) return;
    if (!message.conversation) return; // ignorar não-texto

    // Ignorar grupos conforme configuração
    const isGroupMessage = remoteJid.endsWith('@g.us');
    const crmInstance = await EvolutionInstance.findOne({ instanceName: instance });
    if (!crmInstance) return;
    if (isGroupMessage && !crmInstance.receiveFromGroups) {
      console.log(`[WebhookSvc] Mensagem de grupo ignorada para a instância '${instance}'.`);
      return;
    }

    // Normalização de número (apenas parte antes de @)
    const jidRaw = String(remoteJid);
    const numberOnly = jidRaw.split('@')[0];                 // ex: "558191083489"
    let leadPhoneNumber = fixBrazilianMobileNumber(numberOnly); // ex: "5581991083489"
    const senderPhoneWithPlus = `+${leadPhoneNumber}`;

    // Direção & remetente
    const messageDirection = key?.fromMe ? 'outgoing' : 'incoming';
    const senderIdentifier = key?.fromMe ? (crmInstance.ownerNumber || 'CRM_USER') : remoteJid;

    // Idempotência por channelMessageId
    if (key?.id) {
      const exists = await Message.exists({ company: crmInstance.company, channelMessageId: key.id });
      if (exists) {
        console.log(`[WebhookSvc] Mensagem ${key.id} já processada. Ignorando duplicata.`);
        return;
      }
    }

    // Preview e conteúdo (somente texto)
    const text = String(message.conversation || '');
    const lastMessagePreview = text.length > 30 ? text.substring(0, 30) + '...' : text;

    // Foto de perfil (usar apenas o número); opcional: cachear fora
    let contactPhotoUrl = null;
    try {
      const profilePicUrl = `${process.env.EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instance}`;
      const profileBody = { number: numberOnly };
      const profileHeaders = { headers: { apikey: crmInstance.apiKey } };
      const profilePicResponse = await axios.post(profilePicUrl, profileBody, profileHeaders);
      if (profilePicResponse?.data?.profilePictureUrl) {
        contactPhotoUrl = profilePicResponse.data.profilePictureUrl;
        console.log(`[WebhookSvc] Foto do perfil encontrada para ${numberOnly}.`);
      }
    } catch {
      console.warn(`[WebhookSvc] Não foi possível buscar a foto do perfil para ${numberOnly}.`);
    }

    const companyId = crmInstance.company;

    // 1) Tenta achar Lead existente
    let lead = await Lead.findOne({ contato: senderPhoneWithPlus, company: companyId });
    let conversation;

    if (!lead) {
      if (messageDirection === 'outgoing') {
        // ===== OUTGOING (de você para alguém que não é lead): NÃO cria Lead =====
        // Cria/atualiza Conversation órfã (lead: null) indexada por channelInternalId (remoteJid)
        conversation = await Conversation.findOneAndUpdate(
          { company: companyId, channelInternalId: remoteJid, lead: null },
          {
            $set: {
              tempContactName: senderPhoneWithPlus, // << só o número, sem "Contato"
              contactPhotoUrl: contactPhotoUrl,
              channelInternalId: remoteJid,
              instanceName: instance,
              lastMessage: lastMessagePreview,
              channel: 'WhatsApp'
            },
            $setOnInsert: { unreadCount: 0 }
          },
          { upsert: true, new: true }
        );
      } else {
        // ===== INCOMING (alguém te enviou mensagem) =====
        if (crmInstance.autoCreateLead) {
          // Cria lead e depois reatribui a órfã (se houver)
          console.log(`[WebhookSvc] Nenhum lead encontrado para ${senderPhoneWithPlus}. Criando um novo...`);
          const origemDoc = await origemService.findOrCreateOrigem(
            { nome: 'WhatsApp', descricao: 'Lead recebido via WhatsApp (Evolution API)' },
            companyId
          );

          const leadData = {
            nome: data?.pushName || `Contato WhatsApp ${senderPhoneWithPlus}`,
            contato: senderPhoneWithPlus,
            origem: origemDoc._id
          };

          lead = await LeadService.createLead(leadData, companyId, crmInstance.createdBy);
          console.log(`[WebhookSvc] Novo lead criado (ID: ${lead._id}).`);
        } else {
          // Auto-create OFF: mantém órfã, MAS atualiza o tempContactName
          // (A) Atualiza tempContactName no INCOMING sem lead
          const incomingName = data?.pushName || senderPhoneWithPlus;
          conversation = await Conversation.findOneAndUpdate(
            { company: companyId, channelInternalId: remoteJid, lead: null },
            {
              $set: {
                tempContactName: incomingName, // << substitui "+numero" pelo pushName quando disponível
                contactPhotoUrl: contactPhotoUrl,
                channelInternalId: remoteJid,
                instanceName: instance,
                lastMessage: lastMessagePreview,
                channel: 'WhatsApp'
              },
              $setOnInsert: { unreadCount: 0 }
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    // 2) Se já existe Lead (ou foi criado agora), garantir Conversation vinculada ao Lead
    if (lead) {
      // Se havia uma conversation órfã para esse JID, reatribui ao lead
      const orphanConv = await Conversation.findOne({
        company: companyId,
        channelInternalId: remoteJid,
        lead: null
      });

      if (orphanConv) {
        orphanConv.lead = lead._id;
        orphanConv.leadNameSnapshot = lead.nome; // substitui tempContactName por nome do lead no snapshot
        orphanConv.instanceName = instance;
        orphanConv.contactPhotoUrl = contactPhotoUrl || orphanConv.contactPhotoUrl;
        orphanConv.lastMessage = lastMessagePreview;
        orphanConv.channel = 'WhatsApp';
        await orphanConv.save();
        conversation = orphanConv;
      } else {
        // Upsert por lead
        conversation = await Conversation.findOneAndUpdate(
          { lead: lead._id, channel: 'WhatsApp' },
          {
            $set: {
              company: companyId,
              channelInternalId: remoteJid,
              leadNameSnapshot: lead.nome,
              instanceName: instance,
              contactPhotoUrl: contactPhotoUrl,
              lastMessage: lastMessagePreview
            },
            $setOnInsert: { unreadCount: 0 }
          },
          { upsert: true, new: true }
        );
      }
    }

    if (!conversation) {
      console.error(`[WebhookSvc] Não foi possível encontrar ou criar uma conversa para ${senderPhoneWithPlus}`);
      return;
    }

    // 3) Atualiza last/unread
    conversation.lastMessage = lastMessagePreview;
    conversation.lastMessageAt = new Date();
    if (messageDirection === 'incoming') {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    }
    await conversation.save();

    // 4) Salva a mensagem (conteúdo texto)
    const newMessage = new Message({
      conversation: conversation._id,
      company: companyId,
      channelMessageId: key?.id,
      direction: messageDirection,
      senderId: senderIdentifier,
      content: text,
      lastMessage: lastMessagePreview,
      contentType: 'text',
      mediaUrl: null,
      mediaMimeType: null
    });
    await newMessage.save();

    console.log(`[WebhookSvc] Mensagem (${messageDirection}) salva. Conversa: ${conversation._id}`);
  } catch (error) {
    console.error('[WebhookSvc] Erro em processMessageUpsert:', error?.message || error);
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