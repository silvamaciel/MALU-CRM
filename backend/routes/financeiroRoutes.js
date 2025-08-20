const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware'); // Supondo que precise de autorização
const FinanceiroController = require('../controllers/FinanceiroController');

// Todas as rotas financeiras são protegidas e exigem login
router.use(protect);

// Rota para buscar os KPIs do dashboard financeiro
router.get('/dashboard', FinanceiroController.getDashboardController);

// Rota para listar todas as parcelas com filtros
router.get('/parcelas', FinanceiroController.listarParcelasController);

// Rota para registar a baixa de uma parcela específica
router.post('/parcelas/:id/baixa', FinanceiroController.registrarBaixaController);

// Rota para gerar o plano de pagamentos de um contrato

router.post('/contratos/:contratoId/gerar-plano', authorize('admin'), FinanceiroController.gerarPlanoDePagamentosController);


module.exports = router;