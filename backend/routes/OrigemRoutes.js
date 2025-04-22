const express = require('express');
const router = express.Router();
const origemController = require('../controllers/origemController');

const { protect } = require('../middlewares/authMiddleware');


// Definindo as rotas
router.get('/', protect, origemController.getOrigens);
router.post('/', protect, origemController.createOrigem);
router.put('/:id', protect, origemController.updateOrigem);
router.delete('/:id', protect, origemController.deleteOrigem);

module.exports = router;
