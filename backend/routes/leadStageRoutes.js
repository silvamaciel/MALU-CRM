// routes/leadStageRoutes.js
// (Se já criou o arquivo antes, substitua. Senão, crie novo)
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware'); 

const {
    getAllLeadStages, 
    createLeadStage,  
    updateLeadStage,  
    deleteLeadStage,  
    updateLeadStagesOrderController
} = require('../controllers/LeadStageController');



router.use(protect);

router.route('/')
    .get(getAllLeadStages)
    .post(authorize('admin'), createLeadStage);

router.route('/order')
    .put(authorize('admin'), updateLeadStagesOrderController);

router.route('/:id')
    .put(authorize('admin'), updateLeadStage)
    .delete(authorize('admin'), deleteLeadStage);



module.exports = router;