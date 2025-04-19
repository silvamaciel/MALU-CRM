const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/LeadController');

router.get('/', LeadController.getLeads);
router.post('/', LeadController.createLead);
router.put('/:id', LeadController.updateLead);
router.delete('/:id', LeadController.deleteLead);
router.get('/:id', LeadController.getLeadById);
router.put('/descartar/:id', LeadController.descartarLead); // rota específica para descartar

module.exports = router;
