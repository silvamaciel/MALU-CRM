// backend/controllers/ChatController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ChatService = require('../services/ChatService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Listar todas as conversas da empresa
 * @route   GET /api/chat/conversations
 * @access  Privado
 */
const listConversationsController = asyncHandler(async (req, res) => {
  const companyId = req.user.company;
  const { limit, cursor } = req.query;
  const result = await ChatService.listConversations(companyId, { limit, cursor });
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