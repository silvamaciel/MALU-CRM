// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const asyncHandler = require("../middlewares/asyncHandler");

/**
 * Controller para buscar os dados resumidos do dashboard.
 */
const getSummary = async (req, res) => {
    console.log("[DashboardController] Recebido GET /api/dashboard/summary");
    try {
        // Pega companyId do usuário logado (anexado pelo middleware 'protect')
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }

        // Chama o serviço para buscar os dados
        const summaryData = await dashboardService.getDashboardSummary(companyId);

        res.json(summaryData);

    } catch (error) {
        console.error("[DashboardController] Erro ao buscar resumo:", error.message);
        res.status(500).json({ error: error.message || 'Erro ao buscar dados do dashboard.' });
    }
};


const getFinancialSummaryController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const summary = await DashboardService.getFinancialSummary(companyId);
    res.status(200).json({ success: true, data: summary });
});


module.exports = {
    getSummary,
    getFinancialSummaryController
};