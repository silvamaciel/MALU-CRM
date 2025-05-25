// backend/controllers/ReservaController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ReservaService = require('../services/ReservaService');
const ErrorResponse = require('../utils/errorResponse'); // Sua classe de erro customizada

/**  @desc    Criar uma nova reserva
* @route   POST /api/reservas
* @access  Privado (usuário logado da empresa)
*/
const createReservaController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const creatingUserId = req.user._id;
    
    // Dados esperados do corpo da requisição
    const { 
        leadId, 
        unidadeId, 
        empreendimentoId, 
        validadeReserva, // Ex: "2025-12-31"
        valorSinal, 
        observacoesReserva 
    } = req.body;

    if (!leadId || !unidadeId || !empreendimentoId || !validadeReserva) {
        return next(new ErrorResponse('Campos obrigatórios para reserva: leadId, unidadeId, empreendimentoId, validadeReserva.', 400));
    }

    const reservaData = {
        validadeReserva, 
        valorSinal,
        observacoesReserva
    };

    const novaReserva = await ReservaService.createReserva(
        reservaData,
        leadId,
        unidadeId,
        empreendimentoId,
        companyId,
        creatingUserId
    );
    res.status(201).json({ success: true, data: novaReserva });
});

/**
 * Controller para listar todas as reservas da empresa, com filtros e paginação.
 */
const getReservasController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const { page = 1, limit = 10, ...filters } = req.query; // Pega page, limit e outros filtros da query
        
    const paginationOptions = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    delete filters.page;
    delete filters.limit;

    console.log(`[ReservaCtrl] Recebido GET /api/reservas para Company ${companyId} com filtros:`, filters, `e paginação:`, paginationOptions);

    const result = await ReservaService.getReservasByCompany(companyId, filters, paginationOptions);
    res.status(200).json({ success: true, ...result });
});

module.exports = {
    createReservaController,
    getReservasController
};