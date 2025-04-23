// routes/leadStageRoutes.js
// (Se já criou o arquivo antes, substitua. Senão, crie novo)
const express = require('express');
const router = express.Router();
const leadStageController = require('../controllers/leadStageController');
const { protect, authorize } = require('../middleware/authMiddleware'); 

router.get('/', protect, leadStageController.getAllLeadStages);

router.post('/', protect, authorize('admin'), leadStageController.createLeadStage);

router.put('/:id', protect, authorize('admin'), leadStageController.updateLeadStage);

router.delete('/:id', protect, authorize('admin'), leadStageController.deleteLeadStage);

module.exports = router;