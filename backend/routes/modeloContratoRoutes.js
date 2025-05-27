// backend/routes/modeloContratoRoutes.js
const express = require('express');
const router = express.Router();
const {
    createModeloContratoController,
    getModelosContratoController,
    getModeloContratoByIdController,
    updateModeloContratoController,
    deleteModeloContratoController
} = require('../controllers/ModeloContratoController'); // Ajuste o nome do arquivo se necessário
const { protect, authorize } = require('../middlewares/authMiddleware');

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

// Rotas CRUD para Modelos de Contrato
// Apenas admins da empresa podem criar, atualizar ou deletar modelos
router.route('/')
    .post(authorize(['admin']), createModeloContratoController) // Só admin
    .get(getModelosContratoController); 

router.route('/:id')
    .get(getModeloContratoByIdController) // Todos os usuários logados da empresa podem ver um modelo
    .put(authorize(['admin']), updateModeloContratoController) // Só admin atualiza
    .delete(authorize(['admin']), deleteModeloContratoController); // Só admin desativa

module.exports = router;