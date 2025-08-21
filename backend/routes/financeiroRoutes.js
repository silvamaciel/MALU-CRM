const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const FinanceiroController = require('../controllers/FinanceiroController');

router.use(protect);

// --- Rotas de Contas a Receber ---
router.get('/dashboard', FinanceiroController.getDashboardController);
router.get('/parcelas', FinanceiroController.listarParcelasController);
router.post('/parcelas/:id/baixa', FinanceiroController.registrarBaixaController);
router.post('/parcelas/avulsa', authorize('admin'), FinanceiroController.gerarParcelaAvulsaController);


router.post(
    '/contratos/:contratoId/gerar-plano',
    FinanceiroController.gerarPlanoDePagamentosController
);


// --- Rotas de ADM e Contas a Pagar ---
router.route('/credores')
    .get(authorize('admin'), FinanceiroController.listarCredoresController)
    .post(authorize('admin'), FinanceiroController.criarCredorController);

router.route('/despesas')
    .get(FinanceiroController.listarDespesasController)
    .post(FinanceiroController.criarDespesaController);

router.post('/despesas/:id/pagar', FinanceiroController.registrarPagamentoController);

router.route('/indexadores')
    .get(authorize('admin'), FinanceiroController.getIndexadoresController)
    .post(authorize('admin'), FinanceiroController.createIndexadorController);

router.post('/indexadores/:id/valores', authorize('admin'), FinanceiroController.upsertValorIndexadorController);

module.exports = router;