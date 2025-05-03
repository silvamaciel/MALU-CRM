// routes/brokerContactRoutes.js
const express = require('express');
const router = express.Router();
const brokerContactController = require('../controllers/brokerContactController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// --- Rotas para /api/brokers ---

router.get('/', protect, brokerContactController.getAllBrokerContacts);

router.post('/', protect, brokerContactController.createBrokerContact);

router.get('/:id', protect, brokerContactController.getBrokerContactById);

router.put('/:id', protect, authorize('admin'), brokerContactController.updateBrokerContact);

router.delete('/:id', protect, authorize('admin'), brokerContactController.deleteBrokerContact);

module.exports = router;