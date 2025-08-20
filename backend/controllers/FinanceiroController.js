const asyncHandler = require('../middlewares/asyncHandler');
const FinanceiroService = require('../services/FinanceiroService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Gerar o plano de pagamentos para um contrato.
 * @route   POST /api/financeiro/contratos/:contratoId/gerar-plano
 * @access  Privado (Admin/Corretor)
 */
const gerarPlanoDePagamentosController = asyncHandler(async (req, res, next) => {
    const { contratoId } = req.params;
    // Adicione uma verificação de segurança aqui para garantir que o contrato pertence à empresa do utilizador
    const result = await FinanceiroService.gerarPlanoDePagamentos(contratoId);
    res.status(201).json({ success: true, data: result });
});

/**
 * @desc    Listar parcelas com filtros e paginação.
 * @route   GET /api/financeiro/parcelas
 * @access  Privado
 */
const listarParcelasController = asyncHandler(async (req, res, next) => {
    // Passa todos os filtros da query string (ex: ?status=Pendente&page=1)
    const result = await FinanceiroService.listarParcelas(req.user.company, req.query);
    res.status(200).json({ success: true, ...result });
});

/**
 * @desc    Registar a baixa (pagamento) de uma parcela.
 * @route   POST /api/financeiro/parcelas/:id/baixa
 * @access  Privado
 */
const registrarBaixaController = asyncHandler(async (req, res, next) => {
    const { id: parcelaId } = req.params;
    const dadosBaixa = req.body;
    const userId = req.user._id;

    // Adicione uma verificação para garantir que a parcela pertence à empresa do utilizador
    const parcelaAtualizada = await FinanceiroService.registrarBaixa(parcelaId, dadosBaixa, userId);
    res.status(200).json({ success: true, data: parcelaAtualizada });
});

/**
 * @desc    Buscar dados para o dashboard financeiro (KPIs).
 * @route   GET /api/financeiro/dashboard
 * @access  Privado
 */
const getDashboardController = asyncHandler(async (req, res, next) => {
    const kpis = await FinanceiroService.getDashboardData(req.user.company);
    res.status(200).json({ success: true, data: kpis });
});


const gerarParcelaAvulsaController = asyncHandler(async (req, res, next) => {
    const parcela = await FinanceiroService.gerarParcelaAvulsa(req.body, req.user.company);
    res.status(201).json({ success: true, data: parcela });
});

// --- Controllers para Credores ---

const criarCredorController = asyncHandler(async (req, res) => {
    const credor = await FinanceiroService.criarCredor(req.body, req.user.company);
    res.status(201).json({ success: true, data: credor });
});

const listarCredoresController = asyncHandler(async (req, res) => {
    const credores = await FinanceiroService.listarCredores(req.user.company);
    res.status(200).json({ success: true, data: credores });
});

// --- Controllers para Despesas ---

const criarDespesaController = asyncHandler(async (req, res) => {
    const despesa = await FinanceiroService.criarDespesa(req.body, req.user.company, req.user._id);
    res.status(201).json({ success: true, data: despesa });
});

const listarDespesasController = asyncHandler(async (req, res) => {
    const result = await FinanceiroService.listarDespesas(req.user.company, req.query);
    res.status(200).json({ success: true, ...result });
});

const registrarPagamentoController = asyncHandler(async (req, res) => {
    const despesa = await FinanceiroService.registrarPagamentoDespesa(req.params.id, req.body, req.user._id);
    res.status(200).json({ success: true, data: despesa });
});


module.exports = {
    gerarPlanoDePagamentosController,
    listarParcelasController,
    registrarBaixaController,
    getDashboardController,
    gerarParcelaAvulsaController,
    criarCredorController,
    listarCredoresController,
    criarDespesaController,
    listarDespesasController,
    registrarPagamentoController
};