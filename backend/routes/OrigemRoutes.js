const express = require('express');
const router = express.Router();
const origemController = require('../controllers/origemController');

// Definindo as rotas
router.get('/', origemController.getOrigens);
router.post('/', origemController.createOrigem);
router.put('/:id', origemController.updateOrigem);
router.delete('/:id', origemController.deleteOrigem);

module.exports = router;
