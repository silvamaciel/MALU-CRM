const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/PublicController');


// Rota para o parceiro se identificar
router.post('/broker/check', PublicController.checkBrokerController);

// Rota para o parceiro submeter o lead (usando o token obtido na verificação)
router.post('/submit-lead/:brokerId', PublicController.submitLeadController);

router.post('/broker/register/:companyId', PublicController.registerBrokerController);

module.exports = router;