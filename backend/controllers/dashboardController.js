// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const asyncHandler = require("../middlewares/asyncHandler");

/**
 * Controller para buscar os dados resumidos do dashboard.
 */
const getSummary = async (req, res) => {
    const companyId = req.user.company;
    const { filter } = req.query; // Pega o filtro da URL (ex: ?filter=year)
    const summary = await dashboardService.getLeadSummary(companyId, filter);
    res.status(200).json({ success: true, data: summary });
};


const getFinancialSummaryController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
    const { filter } = req.query;
    const summary = await dashboardService.getFinancialSummary(companyId, filter);
    res.status(200).json({ success: true, data: summary });
});


module.exports = {
    getSummary,
    getFinancialSummaryController
};