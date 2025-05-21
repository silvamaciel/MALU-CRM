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
const { protect, authorize } = require('../middlewares/authMiddleware'); // Assumindo que 'authorize' pode ser usado no futuro

router.use(protect); 


router.route('/')
    .post(createEmpreendimentoController)   // Criar novo empreendimento
    .get(getEmpreendimentosController);    // Listar todos os empreendimentos da empresa

router.route('/:id')
    .get(getEmpreendimentoByIdController)      // Buscar empreendimento por ID
    .put(updateEmpreendimentoController)       // Atualizar empreendimento
    .delete(deleteEmpreendimentoController);   // Desativar (soft delete) empreendimento

module.exports = router;


