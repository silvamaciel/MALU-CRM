// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    listConversationsController, 
    getMessagesController, 
    sendMessageController 
} = require('../controllers/ChatController');

// Todas as rotas de chat são protegidas, exigem login
router.use(protect);

// Rota para listar todas as conversas
router.get('/conversations', listConversationsController);

// Rotas para uma conversa específica
router.get('/conversations/:conversationId/messages', getMessagesController);
router.post('/conversations/:conversationId/messages', sendMessageController);

module.exports = router;