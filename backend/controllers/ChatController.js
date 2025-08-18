// backend/controllers/ChatController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ChatService = require('../services/ChatService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Listar conversas da empresa (opcionalmente filtrando por leadId)
 * @route   GET /api/chat/conversations?limit=30&cursor=<base64>&leadId=<ObjectId>
 * @access  Privado
 */
const listConversationsController = asyncHandler(async (req, res) => {
  const companyId = req.user.company;

  // lê e saneia os params
  const {
    limit: rawLimit,
    cursor = null,
    leadId = null,      
  } = req.query;

  const limit = Math.min(
    Math.max(parseInt(rawLimit ?? '30', 10) || 30, 1),
    100
  );

  // repassa tudo para o service (ele já lida com leadId inválido)
  const result = await ChatService.listConversations(companyId, {
    limit,
    cursor,
    leadId,
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * @desc    Buscar todas as mensagens de uma conversa
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @access  Privado
 */
const getMessagesController = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const companyId = req.user.company;
  const { limit, before, after } = req.query;
  const result = await ChatService.getMessages(conversationId, companyId, { limit, before, after });
  res.status(200).json({ success: true, ...result });
});

/**
 * @desc    Enviar uma nova mensagem
 * @route   POST /api/chat/conversations/:conversationId/messages
 * @access  Privado
 */
const sendMessageController = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const companyId = req.user.company;
    const actorUserId = req.user._id;
    const { content } = req.body;

    if (!content) {
        return next(new ErrorResponse('O conteúdo da mensagem é obrigatório.', 400));
    }

    const newMessage = await ChatService.sendMessage(conversationId, companyId, actorUserId, content);
    res.status(201).json({ success: true, data: newMessage });
});

const createLeadFromConversationController = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const companyId = req.user.company;
    const actorUserId = req.user._id;

    const newLead = await ChatService.createLeadFromConversation(conversationId, companyId, actorUserId);
    res.status(201).json({ success: true, data: newLead });
});

module.exports = {
    listConversationsController,
    getMessagesController,
    sendMessageController,
    createLeadFromConversationController
};