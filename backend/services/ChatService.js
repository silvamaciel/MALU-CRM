const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const EvolutionInstance = require('../models/EvolutionInstance');
const axios = require('axios');
const Lead = require('../models/Lead');
const LeadService = require('./LeadService');
const { fixBrazilianMobileNumber } = require('./evolutionWebhookService');
const origemService = require('./origemService');



// ---------- Helpers de cursor ----------
const encodeCursor = (doc) =>
  Buffer.from(`${new Date(doc.lastMessageAt).getTime()}|${doc._id.toString()}`).toString('base64');

const decodeCursor = (cursor) => {
  try {
    const [ts, id] = Buffer.from(cursor, 'base64').toString('utf8').split('|');
    return { ts: new Date(Number(ts)), id: new mongoose.Types.ObjectId(id) };
  } catch {
    return null;
  }
};

// Coerção flex: aceita ISO, epoch ou messageId
const coerceToDate = async (val) => {
  if (!val) return null;
  if (/^[a-f0-9]{24}$/i.test(val)) {
    const m = await Message.findById(val).select('createdAt').lean();
    return m?.createdAt || null;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};



/**
 * Lista conversas com cursor pagination + lastMessage e unreadCount embarcados.
 * GET /conversations?limit=30&cursor=<base64>
 */
const listConversations = async (companyId, { limit = 30, cursor = null } = {}) => {
    if (!companyId) return { items: [], nextCursor: null };

    // Filtro base
    const match = { company: new mongoose.Types.ObjectId(companyId) };
    // Cursor composto (lastMessageAt desc, _id desc)
    if (cursor) {
        const c = decodeCursor(cursor);
        if (c?.ts && c?.id) {
            match.$or = [
                { lastMessageAt: { $lt: c.ts } },
                { lastMessageAt: c.ts, _id: { $lt: c.id } }
            ];
        }
    }

    // Pipeline agregada para matar N+1
    const pipeline = [
        { $match: match },
        { $sort: { lastMessageAt: -1, _id: -1 } },
        { $limit: Number(limit) + 1 },

        // last message
        {
          $lookup: {
            from: 'messages',
            let: { convId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$conversation', '$$convId'] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { direction: 1, content: 1 } }
            ],
            as: 'lastMsg'
          }
        },
        {
          $addFields: {
            lastMessage: { $ifNull: [{ $arrayElemAt: ['$lastMsg.content', 0] }, '' ] },
            lastMessageDirection: { $arrayElemAt: ['$lastMsg.direction', 0] }
          }
        },
        {
          $project: {
            lastMsg: 0
          }
        }
    ];

    const docs = await Conversation.aggregate(pipeline).exec();

    const hasExtra = docs.length > limit;
    const items = hasExtra ? docs.slice(0, limit) : docs;
    const nextCursor = hasExtra ? encodeCursor(docs[limit - 1]) : null;

    // Nota: unreadCount confiável vem da Conversation (você já reseta na leitura)
    return { items, nextCursor };
};


/**
 * Mensagens com paginação:
 * - Sem params: retorna o *último* bloco (limit) em ordem cronológica ASC.
 * - before: carrega mais antigas (infinite reverso).
 * - after: carrega apenas novas (polling).
 * GET /messages?limit=30&before=<iso|id>&after=<iso|id>
 */
const getMessages = async (conversationId, companyId, { limit = 30, before, after } = {}) => {
    const conv = await Conversation.findOne({ _id: conversationId, company: companyId }).lean();
    if (!conv) throw new Error('Conversa não encontrada.');

    // Zera contador centralizado na Conversation (modelo atual)
    if (conv.unreadCount > 0) {
        await Conversation.updateOne({ _id: conv._id }, { $set: { unreadCount: 0 } });
    }

    const query = { conversation: conversationId };
    let sort = { createdAt: -1 }; // default p/ pegar últimas
    let needReverse = true;

    const beforeDate = await coerceToDate(before);
    const afterDate = await coerceToDate(after);

    if (afterDate) {
        // polling de novas
        query.createdAt = { $gt: afterDate };
        sort = { createdAt: 1 };
        needReverse = false;
    } else if (beforeDate) {
        // paginação de mais antigas
        query.createdAt = { $lt: beforeDate };
        sort = { createdAt: -1 };
        needReverse = true;
    }

    const rows = await Message.find(query)
        .sort(sort)
        .limit(Number(limit))
        .lean();

    const items = needReverse ? rows.reverse() : rows;

    // Cursor para próxima página de "antigas"
    const nextBefore = items.length ? items[0].createdAt : null;

    return { items, nextBefore };
};

/**
 * Envia uma nova mensagem de texto a partir do CRM.
 */
const sendMessage = async (conversationId, companyId, actorUserId, messageContent) => {
    const conversation = await Conversation.findOne({ _id: conversationId, company: companyId });
    if (!conversation) {
        throw new Error("Conversa não encontrada.");
    }

    const crmInstance = await EvolutionInstance.findOne({ company: companyId, status: 'open' });
    if (!crmInstance) {
        throw new Error("Nenhuma instância do WhatsApp está conectada e pronta para enviar mensagens para esta empresa.");
    }

    try {
        // Usa o JID completo salvo na conversa, que é o que a ferramenta de teste está usando.
        const recipientJid = conversation.channelInternalId;
        if (!recipientJid) {
            throw new Error(`Destinatário (JID) não encontrado na conversa.`);
        }

        console.log(`[ChatService] Enviando mensagem para: ${recipientJid} na instância: ${crmInstance.instanceName}`);


        const payload = {
            number: recipientJid,
            options: {
                delay: 1200,
                presence: "composing"
            },
            text: messageContent
        };

        const response = await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${crmInstance.instanceName}`,
            payload,
            { headers: { 'apikey': crmInstance.apiKey } }
        );

        // --- O resto da lógica para salvar a mensagem no seu banco continua a mesma ---
        const newMessage = new Message({
            conversation: conversation._id,
            company: companyId,
            channelMessageId: response.data.key?.id,
            direction: 'outgoing',
            senderId: actorUserId.toString(),
            content: messageContent,
            status: 'sent'
        });
        await newMessage.save();

        conversation.lastMessage = messageContent;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        return newMessage;

    } catch (error) {
        console.error("[ChatService] ERRO DETALHADO da Evolution API:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(error.response?.data?.message || "Falha ao enviar mensagem via Evolution API.");
    }
};


/**
 * Cria um Lead a partir de uma conversa não atribuída.
 * @param {string} conversationId - O ID da conversa "órfã".
 * @param {string} companyId - ID da empresa.
 * @param {string} actorUserId - ID do usuário que está realizando a ação.
 * @returns {Promise<object>} O Lead recém-criado.
 */
const createLeadFromConversation = async (conversationId, companyId, actorUserId) => {
    console.log(`[ChatService] Criando Lead a partir da Conversa ID: ${conversationId}`);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const conversation = await Conversation.findOne({ _id: conversationId, company: companyId, lead: null }).session(session);
        if (!conversation) {
            throw new Error("Conversa não encontrada, já atribuída a um lead ou não pertence a esta empresa.");
        }

        // 1. Pega o número "cru" (apenas dígitos)
        let senderPhoneRaw = conversation.channelInternalId.split('@')[0];
        
        // 2. Aplica a mesma função de correção que usamos no webhook
        senderPhoneRaw = fixBrazilianMobileNumber(senderPhoneRaw);

        // 3. Monta os dados para o novo Lead com o número corrigido
        const origemDoc = await origemService.findOrCreateOrigem(
            { nome: 'WhatsApp', descricao: 'Lead criado a partir de uma conversa no chat.' }, 
            companyId
        );

        // 2. Monta os dados para o novo Lead com o ID da origem
        const leadData = {
            nome: conversation.tempContactName || `Contato WhatsApp ${senderPhoneRaw}`,
            contato: senderPhoneRaw,
            origem: origemDoc._id
        };
        // 4. Chama o serviço de criação de Lead, que agora recebe um número válido para formatar
        const newLead = await LeadService.createLead(leadData, companyId, actorUserId, { session });
        console.log(`[ChatService] Novo lead criado com ID: ${newLead._id}`);

        // 5. Atualiza a conversa, vinculando-a ao novo lead
        conversation.lead = newLead._id;
        conversation.leadNameSnapshot = newLead.nome;
        conversation.tempContactName = null;
        await conversation.save({ session });
        
        await session.commitTransaction();
        return newLead;

    } catch (error) {
        await session.abortTransaction();
        console.error(`[ChatService] Erro ao criar lead a partir da conversa ${conversationId}:`, error);
        throw new Error(error.message || "Erro ao criar lead a partir da conversa.");
    } finally {
        session.endSession();
    }
};



module.exports = { listConversations, getMessages, sendMessage, createLeadFromConversation };