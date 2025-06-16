// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');
// Rota para buscar o resumo de dados do dashboard
// GET /api/dashboard/summary
router.get('/summary', protect, dashboardController.getSummary);
router.get('/financeiro', protect, dashboardController.getFinancialSummaryController);
router.get('/advanced-metrics', protect, dashboardController.getAdvancedMetricsController);
router.get('/financeiro-detalhado', protect, dashboardController.getDetailedFinancialSummaryController);





module.exports = router;
