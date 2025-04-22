// routes/discardReasonRoutes.js
const express = require('express');
const router = express.Router();
const discardReasonController = require('../controllers/discardReasonController');

const { protect } = require('../middlewares/authMiddleware');


router.get('/', discardReasonController.getAllDiscardReasons);
router.post('/', protect, discardReasonController.createDiscardReason);
router.put('/:id', protect, discardReasonController.updateDiscardReason);
router.delete('/:id', protect, discardReasonController.deleteDiscardReason);

module.exports = router;