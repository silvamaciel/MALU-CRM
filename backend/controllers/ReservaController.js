// backend/controllers/ReservaController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ReservaService = require('../services/ReservaService');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**
 * @desc    Criar uma nova Reserva (polimórfica)
 * @route   POST /api/reservas
 * @access  Privado
 */
const createReservaController = asyncHandler(async (req, res, next) => {
    
    const companyId = req.user.company;
    const creatingUserId = req.user._id;
    
    // 1. Desestrutura TODOS os campos necessários do corpo da requisição
    const { 
        leadId, 
        imovelId, 
        tipoImovel,
        validadeReserva, 
        valorSinal, 
        observacoesReserva 
    } = req.body;

    // 2. Validação mínima no controller
    if (!leadId || !imovelId || !tipoImovel || !validadeReserva) {
        return next(
            new ErrorResponse(
                'Campos obrigatórios: leadId, imovelId, tipoImovel, validadeReserva.',
                400
            )
        );
    }
    
    // 3. Agrupa os dados específicos da reserva em um único objeto
    const reservaData = { validadeReserva, valorSinal, observacoesReserva };

    // 4. VVVVV CHAMADA AO SERVIÇO CORRIGIDA VVVVV
    // Passa cada parte da informação como um argumento separado, na ordem correta
    const novaReserva = await ReservaService.createReserva(
        reservaData,        // 1º argumento: dados da reserva
        leadId,             // 2º argumento: ID do lead
        imovelId,           // 3º argumento: ID do imóvel
        tipoImovel,         // 4º argumento: 'Unidade' ou 'ImovelAvulso'
        companyId,          // 5º argumento: ID da empresa
        creatingUserId      // 6º argumento: ID do usuário criando
    );
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    
    res.status(201).json({ success: true, data: novaReserva });
});


/**
 * Controller para listar todas as reservas da empresa, com filtros e paginação.
 */
const getReservasController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const queryParams = req.query;
    
    console.log(`[ReservaCtrl] Recebido GET /api/reservas para Company ${companyId} com filtros:`, queryParams);

    const result = await ReservaService.getReservasByCompany(companyId, queryParams);
    res.status(200).json({ success: true, ...result });
});


/**
 * Controller para buscar uma reserva por id.
 */
const getReservaByIdController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const reserva = await ReservaService.getReservaById(req.params.id, companyId);
    if (!reserva) {
        return next(new ErrorResponse(`Reserva com ID ${req.params.id} não encontrada.`, 404));
    }
    res.status(200).json({ success: true, data: reserva });
});


/**
 * @desc    Excluir uma reserva (reverte vínculos)
 * @route   DELETE /api/reservas/:id
 * @access  Privado
 */
const deleteReservaController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
  const userId = req.user._id;
  const { id } = req.params;

  const result = await ReservaService.deleteReserva(id, companyId, userId);
  return res.status(200).json({
    success: true,
    message: 'Reserva excluída com sucesso.',
    data: result,
  });
});



module.exports = {
    createReservaController,
    getReservasController,
    getReservaByIdController,
    deleteReservaController
};