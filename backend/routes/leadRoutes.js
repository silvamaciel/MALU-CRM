const express = require('express')
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { protect } = require('../middlewares/authMiddleware');



router.get('/', protect, LeadController.getLeads);
router.post('/', protect, LeadController.createLead);
router.put('/:id', protect, LeadController.updateLead);
router.delete('/:id', protect, LeadController.deleteLead);
router.get('/:id', protect, LeadController.getLeadById);
router.put('/descartar/:id', protect, LeadController.descartarLead); 
router.get('/:id/history',  protect, LeadController.getLeadHistory);


module.exports = router;
