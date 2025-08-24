const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const SignatureController = require('../controllers/SignatureController');

// Todas as rotas de assinatura são protegidas
router.use(protect);

// Rota para o utilizador do CRM acionar o envio de um contrato
router.post('/contratos/:id/enviar', SignatureController.enviarContratoController);

module.exports = router;