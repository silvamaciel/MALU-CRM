const express = require('express');
const router = express.Router();
const LeadStagecontroller = require('../controllers/LeadStageController');

router.get('/', LeadStagecontroller.getLeadStages);
router.post('/', LeadStagecontroller.createLeadStage);
router.put('/:id', LeadStagecontroller.updateLeadStage);
router.delete('/:id', LeadStagecontroller.deleteLeadStage);

module.exports = router;
