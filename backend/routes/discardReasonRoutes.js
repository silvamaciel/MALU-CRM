// routes/discardReasonRoutes.js
const express = require('express');
const router = express.Router();
const discardReasonController = require('../controllers/discardReasonController');


router.get('/', discardReasonController.getAllDiscardReasons);
router.post('/', discardReasonController.createDiscardReason);
router.put('/:id', discardReasonController.updateDiscardReason);
router.delete('/:id', discardReasonController.deleteDiscardReason);

module.exports = router;