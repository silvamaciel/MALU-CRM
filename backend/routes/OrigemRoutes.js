// routes/origemRoutes.js
const express = require('express');
const router = express.Router();
const origemController = require('../controllers/OrigemController');
const { protect, authorize } = require('../middlewares/authMiddleware'); // Usando 'middlewares' como você indicou

router.get('/', protect, origemController.getOrigens);

router.post('/', protect, authorize('admin'), origemController.createOrigem);

router.put('/:id', protect, authorize('admin'), origemController.updateOrigem);

router.delete('/:id', protect, authorize('admin'), origemController.deleteOrigem);

router.post('/ensure', origemController.ensureOrigem);

module.exports = router;