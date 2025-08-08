const express = require('express');
const router = express.Router();
const PublicLeadController = require('../controllers/PublicLeadController');

// IMPORTANTE: Esta rota NÃO usa o middleware 'protect'
router.post('/submit-lead/:brokerToken', PublicLeadController.submitLead);

module.exports = router;