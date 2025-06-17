const express = require('express')
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { protect } = require('../middlewares/authMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



router.get('/', protect, LeadController.getLeads);
router.post('/', protect, LeadController.createLead);
router.put('/:id', protect, LeadController.updateLead);
router.delete('/:id', protect, LeadController.deleteLead);
router.get('/:id', protect, LeadController.getLeadById);
router.put('/descartar/:id', protect, LeadController.descartarLead); 
router.get('/:id/history',  protect, LeadController.getLeadHistory);
router.post('/importar-csv', protect, upload.single('csvfile'), LeadController.importLeadsFromCSVController);
router.get('/csv-template', LeadController.downloadCSVTemplateController);



module.exports = router;
