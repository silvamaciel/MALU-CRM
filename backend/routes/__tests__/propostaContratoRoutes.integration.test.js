// backend/routes/__tests__/propostaContratoRoutes.integration.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const propostaContratoRoutes = require('../propostaContratoRoutes');
const PropostaContratoService = require('../../services/PropostaContratoService');
const authMiddleware = require('../../middlewares/authMiddleware');

jest.mock('../../services/PropostaContratoService');
jest.mock('../../middlewares/authMiddleware', () => ({
    protect: jest.fn((req, res, next) => {
        req.user = {
            _id: new mongoose.Types.ObjectId().toString(),
            company: new mongoose.Types.ObjectId().toString(),
            perfil: 'admin'
        };
        next();
    }),
    authorize: (...roles) => jest.fn((req, res, next) => {
        if (req.user && roles.includes(req.user.perfil)) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden' });
        }
    }),
}));

const app = express();
app.use(express.json());
// Mount at a base path that matches its actual usage if routes are nested,
// but for direct testing, this is fine.
// If server.js mounts it like app.use('/api/propostas-contratos', propostaContratoRoutes);
// then the test path would be '/api/propostas-contratos/a-partir-da-reserva/...'
// For now, assuming direct mount for simplicity of this test file.
app.use('/propostas-contratos', propostaContratoRoutes);

describe('PropostaContrato Routes Integration Tests', () => {
    const companyId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();
    const reservaId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        authMiddleware.protect.mockImplementation((req, res, next) => {
            req.user = { _id: userId, company: companyId, perfil: 'admin' };
            next();
        });
    });

    describe('POST /propostas-contratos/a-partir-da-reserva/:reservaId', () => {
        const validPropostaData = {
            valorPropostaContrato: 100000,
            responsavelNegociacao: new mongoose.Types.ObjectId().toString(),
            adquirentesSnapshot: [{ nome: 'Test Adquirente', cpf: '12345678900' }]
            // Add other required fields by PropostaContratoService.createPropostaContrato
        };

        it('should create a proposta/contrato successfully with valid data', async () => {
            const mockCreatedProposta = { ...validPropostaData, _id: new mongoose.Types.ObjectId().toString() };
            PropostaContratoService.createPropostaContrato.mockResolvedValue(mockCreatedProposta);

            const response = await request(app)
                .post(`/propostas-contratos/a-partir-da-reserva/${reservaId}`)
                .send(validPropostaData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockCreatedProposta);
            expect(PropostaContratoService.createPropostaContrato).toHaveBeenCalledWith(
                reservaId,
                validPropostaData,
                companyId,
                userId
            );
        });

        it('should return 400 if valorPropostaContrato is missing', async () => {
            const invalidData = { ...validPropostaData, valorPropostaContrato: undefined };
            // This validation is in the controller before calling the service.
            const response = await request(app)
                .post(`/propostas-contratos/a-partir-da-reserva/${reservaId}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valor da Proposta e Responsável pela Negociação são obrigatórios.');
            expect(PropostaContratoService.createPropostaContrato).not.toHaveBeenCalled();
        });

        it('should return 400 if reservaId is invalid', async () => {
            const invalidReservaId = 'invalid-id';
            const response = await request(app)
                .post(`/propostas-contratos/a-partir-da-reserva/${invalidReservaId}`)
                .send(validPropostaData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ID da Reserva válido é obrigatório.');
            expect(PropostaContratoService.createPropostaContrato).not.toHaveBeenCalled();
        });


        it('should return 401 if not authenticated', async () => {
            authMiddleware.protect.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Not authorized' });
            });

            const response = await request(app)
                .post(`/propostas-contratos/a-partir-da-reserva/${reservaId}`)
                .send(validPropostaData);

            expect(response.status).toBe(401);
            expect(PropostaContratoService.createPropostaContrato).not.toHaveBeenCalled();
        });

        it('should return 500 if service throws an error', async () => {
            PropostaContratoService.createPropostaContrato.mockRejectedValue(new Error('Service error'));
            const response = await request(app)
                .post(`/propostas-contratos/a-partir-da-reserva/${reservaId}`)
                .send(validPropostaData);

            expect(response.status).toBe(500); // Assuming asyncHandler catches and returns 500
            expect(response.body.error).toBe('Service error');
        });
    });
    // TODO: Add tests for other PropostaContrato routes (GET /:id, PUT /:id, GET /:id/pdf, etc.)
});
