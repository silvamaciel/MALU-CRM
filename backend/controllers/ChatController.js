// backend/controllers/ChatController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ChatService = require('../services/ChatService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Listar todas as conversas da empresa
 * @route   GET /api/chat/conversations
 * @access  Privado
 */
const listConversationsController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const conversations = await ChatService.listConversations(companyId);
    res.status(200).json({ success: true, data: conversations });
});

/**
 * @desc    Buscar todas as mensagens de uma conversa
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @access  Privado
 */
const getMessagesController = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const companyId = req.user.company;
    const messages = await ChatService.getMessages(conversationId, companyId);
    res.status(200).json({ success: true, data: messages });
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

module.exports = {
    listConversationsController,
    getMessagesController,
    sendMessageController
};