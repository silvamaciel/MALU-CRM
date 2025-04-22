const express = require('express');
const router = express.Router();
const LeadStagecontroller = require('../controllers/LeadStageController');

const { protect } = require('../middlewares/authMiddleware');


router.get('/', protect, LeadStagecontroller.getLeadStages);
router.post('/', protect, LeadStagecontroller.createLeadStage);
router.put('/:id', protect, LeadStagecontroller.updateLeadStage);
router.delete('/:id', protect, LeadStagecontroller.deleteLeadStage);

module.exports = router;
