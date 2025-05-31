// backend/controllers/PropostaContratoController.js
const asyncHandler = require('../middlewares/asyncHandler');
const PropostaContratoService = require('../services/PropostaContratoService');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**  @desc    Criar uma nova Proposta/Contrato a partir de uma Reserva
* @route   POST /api/propostas-contratos/reserva/:reservaId 
* POST /api/propostas-contratos (se reservaId vier no body)
* @access  Privado
*/
const createPropostaContratoController = asyncHandler(async (req, res, next) => {

    
    console.log("[PropContCtrl] INÍCIO createPropostaContratoController");
    console.log("[PropContCtrl] req.user:", req.user ? { id: req.user._id, company: req.user.company } : "req.user não definido");
    console.log("[PropContCtrl] req.params:", JSON.stringify(req.params, null, 2));
    console.log("[PropContCtrl] req.body (antes de processar):", JSON.stringify(req.body, null, 2));
    

    const { reservaId } = req.params; // Se reservaId vier da URL
    // Se reservaId vier do corpo da requisição: const { reservaId, ...propostaContratoData } = req.body;
    const propostaContratoData = req.body; // Assume que o resto dos dados da proposta vêm no corpo

    const companyId = req.user.company;
    const creatingUserId = req.user._id;

    console.log(`[PropContCtrl] Recebido POST para criar Proposta/Contrato a partir da Reserva ID: ${reservaId || propostaContratoData.reservaId} para Company: ${companyId}`);

    const idReserva = reservaId || propostaContratoData.reservaId; // Pega o reservaId da URL ou do corpo

    if (!idReserva || !mongoose.Types.ObjectId.isValid(idReserva)) {
        return next(new ErrorResponse('ID da Reserva válido é obrigatório.', 400));
    }

    // Remove reservaId de propostaContratoData se ele veio do params para não duplicar
    if (reservaId && propostaContratoData.reservaId) {
        delete propostaContratoData.reservaId;
    }

    if (!propostaContratoData.valorPropostaContrato || !propostaContratoData.responsavelNegociacao) {
        return next(new ErrorResponse('Valor da Proposta e Responsável pela Negociação são obrigatórios.', 400));
    }

    // VVVVV LOG ANTES DE CHAMAR O SERVIÇO VVVVV
    console.log("[PropContCtrl] Chamando PropostaContratoService.createPropostaContrato...");
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


    const novaPropostaContrato = await PropostaContratoService.createPropostaContrato(
        idReserva,
        propostaContratoData,
        companyId,
        creatingUserId
    );

    // VVVVV LOG APÓS CHAMAR O SERVIÇO VVVVV
    console.log("[PropContCtrl] PropostaContratoService.createPropostaContrato retornou com sucesso.");
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    res.status(201).json({ success: true, data: novaPropostaContrato });
});

const getPropostaContratoByIdController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const { id: propostaContratoId } = req.params; // Pega 'id' da rota /api/propostas-contratos/:id

    console.log(`[PropContCtrl] Recebido GET /api/propostas-contratos/${propostaContratoId} para Company ${companyId}`);

    const propostaContrato = await PropostaContratoService.getPropostaContratoById(propostaContratoId, companyId);

    if (!propostaContrato) {
        return next(new ErrorResponse(`Proposta/Contrato com ID ${propostaContratoId} não encontrada.`, 404));
    }
    res.status(200).json({ success: true, data: propostaContrato });
});

/**
 * Controller para baixar o PDF de uma Proposta/Contrato.
 */
const downloadPropostaContratoPDFController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const { id: propostaContratoId } = req.params;

    console.log(`[PropContCtrl PDF] Recebido GET /api/propostas-contratos/${propostaContratoId}/pdf para Company ${companyId}`);

    if (!propostaContratoId || !mongoose.Types.ObjectId.isValid(propostaContratoId)) {
        return next(new ErrorResponse('ID da Proposta/Contrato inválido.', 400));
    }

    try {
        const pdfBuffer = await PropostaContratoService.gerarPDFPropostaContrato(propostaContratoId, companyId);

        if (!pdfBuffer) { // O serviço pode ter lançado erro, mas como dupla checagem
            return next(new ErrorResponse('PDF não pôde ser gerado.', 500));
        }

        const filename = `proposta_contrato_${propostaContratoId}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(pdfBuffer); 
        console.log(`[PropContCtrl PDF] PDF para Proposta/Contrato ${propostaContratoId} enviado para download.`);

    } catch (error) {
        console.error(`[PropContCtrl PDF] Erro ao gerar/enviar PDF para Proposta/Contrato ${propostaContratoId}:`, error);
        return next(new ErrorResponse(error.message || 'Falha ao gerar o PDF.', 500));
    }
});


module.exports = {
    createPropostaContratoController,
    getPropostaContratoByIdController,
    downloadPropostaContratoPDFController
};