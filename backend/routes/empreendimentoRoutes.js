// backend/routes/empreendimentoRoutes.js
const express = require('express');
const router = express.Router();
const {
    createEmpreendimentoController,
    getEmpreendimentosController,
    getEmpreendimentoByIdController,
    updateEmpreendimentoController,
    deleteEmpreendimentoController
} = require('../controllers/empreendimentoController');
const { protect } = require('../middlewares/authMiddleware');

// <<< Importar as rotas de unidade >>>
const unidadeRoutes = require('./unidadeRoutes');

// Aplicar middleware de proteção a todas as rotas de empreendimentos
router.use(protect);

router.use('/:empreendimentoId/unidades', unidadeRoutes);

router.route('/')
    .post(createEmpreendimentoController)
    .get(getEmpreendimentosController);

router.route('/:id') 
    .get(getEmpreendimentoByIdController)
    .put(updateEmpreendimentoController)
    .delete(deleteEmpreendimentoController);

module.exports = router;