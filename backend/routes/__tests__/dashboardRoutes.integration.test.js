// backend/routes/__tests__/dashboardRoutes.integration.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dashboardRoutes = require('../dashboardRoutes');
const DashboardService = require('../../services/dashboardService');
const authMiddleware = require('../../middlewares/authMiddleware');

jest.mock('../../services/dashboardService');
jest.mock('../../middlewares/authMiddleware', () => ({
    protect: jest.fn((req, res, next) => {
        req.user = {
            _id: new mongoose.Types.ObjectId().toString(),
            company: new mongoose.Types.ObjectId().toString(),
            perfil: 'admin'
        };
        next();
    }),
    // authorize is not typically used on dashboard GET routes, but include if necessary
}));

const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRoutes); // Mount dashboard routes

describe('Dashboard Routes Integration Tests', () => {
    const companyId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        authMiddleware.protect.mockImplementation((req, res, next) => {
            req.user = { _id: userId, company: companyId, perfil: 'admin' };
            next();
        });
    });

    describe('GET /api/dashboard/summary', () => {
        it('should return summary data successfully', async () => {
            const mockSummaryData = {
                totalLeadsPeriodo: 10,
                descartadosPeriodo: 2,
                // ... other summary fields
            };
            DashboardService.getLeadSummary.mockResolvedValue(mockSummaryData);

            const response = await request(app)
                .get('/api/dashboard/summary')
                .query({ filter: 'month' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockSummaryData);
            expect(DashboardService.getLeadSummary).toHaveBeenCalledWith(companyId, 'month');
        });

        it('should call getLeadSummary with default filter if none provided', async () => {
            DashboardService.getLeadSummary.mockResolvedValue({});
            await request(app).get('/api/dashboard/summary');
            // The controller defaults filter to 'month' if req.query.filter is undefined
            // However, the service itself has a default: getLeadSummary = async (companyId, filter = 'month')
            // So if controller passes undefined, service uses 'month'.
            expect(DashboardService.getLeadSummary).toHaveBeenCalledWith(companyId, undefined);
        });


        it('should return 401 if not authenticated', async () => {
            authMiddleware.protect.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Not authorized' });
            });

            const response = await request(app).get('/api/dashboard/summary');
            expect(response.status).toBe(401);
            expect(DashboardService.getLeadSummary).not.toHaveBeenCalled();
        });

        it('should return 500 if service throws an error', async () => {
            DashboardService.getLeadSummary.mockRejectedValue(new Error('Service failure'));
            const response = await request(app).get('/api/dashboard/summary');

            // The dashboardController.getSummary does not explicitly handle errors with ErrorResponse
            // It relies on a global error handler or asyncHandler's default behavior.
            // Let's assume asyncHandler will pass it to an Express error handler that sets 500.
            expect(response.status).toBe(500);
            // The actual error message might not be "Service failure" if there's a generic error handler.
            // For now, we check that it's an error.
            expect(response.body.error).toBeDefined();
        });
    });

    // TODO: Add tests for GET /api/dashboard/financeiro
    // TODO: Add tests for GET /api/dashboard/advanced-metrics
    // TODO: Add tests for GET /api/dashboard/financeiro-detalhado
});
