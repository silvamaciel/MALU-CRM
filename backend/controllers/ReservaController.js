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



module.exports = {
    createReservaController
};