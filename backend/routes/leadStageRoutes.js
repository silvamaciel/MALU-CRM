// routes/leadStageRoutes.js
// (Se já criou o arquivo antes, substitua. Senão, crie novo)
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware'); 
const leadStageController = require('../controllers/LeadStageController');

router.get('/', protect, leadStageController.getAllLeadStages);

router.post('/', protect, authorize('admin'), leadStageController.createLeadStage);

router.put('/:id', protect, authorize('admin'), leadStageController.updateLeadStage);

router.delete('/:id', protect, authorize('admin'), leadStageController.deleteLeadStage);

router.put('/order', leadStageController.updateLeadStagesOrderController);


module.exports = router;