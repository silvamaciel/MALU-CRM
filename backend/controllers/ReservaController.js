// backend/controllers/ReservaController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ReservaService = require('../services/ReservaService');
const ErrorResponse = require('../utils/errorResponse'); // Sua classe de erro customizada

/**
 * @desc    Criar uma nova Reserva (polimórfica)
 * @route   POST /api/reservas
 * @access  Privado
 */
const createReservaController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const creatingUserId = req.user._id;
    
    // Desestrutura todos os campos do corpo da requisição
    const { 
        leadId, 
        imovelId, 
        tipoImovel,
        validadeReserva, 
        valorSinal, 
        observacoesReserva 
    } = req.body;

    // Validação principal
    if (!leadId || !imovelId || !tipoImovel || !validadeReserva) {
        return next(new ErrorResponse('Campos obrigatórios: leadId, imovelId, tipoImovel, validadeReserva.', 400));
    }
    
    // Agrupa os dados específicos da reserva
    const reservaData = { validadeReserva, valorSinal, observacoesReserva };

    const novaReserva = await ReservaService.createReserva(
        reservaData,
        leadId,
        imovelId,
        tipoImovel,
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


/**
 * Controller para listar reservas por id, com filtros e paginação.
 */
const getReservaByIdController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company; // Ou verificar se a reserva pertence à company
    const reserva = await ReservaService.getReservaById(req.params.id, companyId); // Crie esta função no ReservaService
    if (!reserva) {
        return next(new ErrorResponse(`Reserva com ID ${req.params.id} não encontrada.`, 404));
    }
    res.status(200).json({ success: true, data: reserva });
});

module.exports = {
    createReservaController,
    getReservasController,
    getReservaByIdController
};