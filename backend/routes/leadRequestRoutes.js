const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/LeadRequestController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// público (corretor)
router.post('/public/lead-requests', protect, ctrl.createPublic);

// admin
router.get('/lead-requests', protect, authorize('admin'), ctrl.listAdmin);
router.post('/lead-requests/:id/approve', protect, authorize('admin'), ctrl.approve);
router.post('/lead-requests/:id/reject',  protect, authorize('admin'), ctrl.reject);

module.exports = router;
