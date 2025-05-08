// routes/integrationRoutes.js
const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middlewares/authMiddleware'); // Apenas protect é necessário aqui

// POST /api/integrations/facebook/connect-page
// Recebe o ID da página selecionada e o User Access Token do frontend
// para finalizar a conexão e configurar o webhook. Rota protegida.
router.post('/facebook/connect-page', protect, integrationController.connectFacebookPage);


// Adicione outras rotas de integração aqui (ex: GET /api/integrations/status)

module.exports = router;