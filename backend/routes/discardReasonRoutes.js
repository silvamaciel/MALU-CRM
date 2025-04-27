// routes/discardReasonRoutes.js
const express = require('express');
const router = express.Router();
const discardReasonController = require('../controllers/discardReasonController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// GET /api/motivosdescarte - Listar motivos da empresa (Protegido por Login)
router.get('/', protect, discardReasonController.getAllDiscardReasonsByCompany);

router.post('/', protect, authorize('admin'), discardReasonController.createDiscardReason);

router.put('/:id', protect, authorize('admin'), discardReasonController.updateDiscardReason);

router.delete('/:id', protect, authorize('admin'), discardReasonController.deleteDiscardReason);

module.exports = router;