// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Rota para Facebook verificar o endpoint (GET)
router.get('/facebook/leads', webhookController.verifyFacebookWebhook);

// Rota para receber dados de leads do Facebook (POST)
router.post('/facebook/leads', webhookController.handleFacebookLeadWebhook);

// Adicione rotas para outros webhooks (ex: WhatsApp) aqui depois

module.exports = router;