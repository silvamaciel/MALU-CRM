const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { protect, authorize } = require('../middlewares/authMiddleware'); // Adicionado authorize para consistência
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.get('/csv-template', LeadController.downloadCSVTemplateController);

router.post('/importar-csv', protect, authorize('admin'), upload.single('csvfile'), LeadController.importLeadsFromCSVController);


router.use(protect);

router.route('/')
    .get(LeadController.getLeads)
    .post(LeadController.createLead);

// Rota para o histórico de um lead específico
router.get('/:id/history', LeadController.getLeadHistory);

// Rota para descartar um lead
router.put('/descartar/:id', LeadController.descartarLead);

router.route('/:id')
    .get(LeadController.getLeadById)
    .put(LeadController.updateLead)
    .delete(authorize('admin'), LeadController.deleteLead);

module.exports = router;