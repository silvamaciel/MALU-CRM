// backend/controllers/unidadeController.js
const asyncHandler = require('../middlewares/asyncHandler');
const unidadeService = require('../services/unidadeService');
const ErrorResponse = require('../utils/errorResponse');

/** @desc    Criar uma nova unidade para um empreendimento
*@route   POST /api/empreendimentos/:empreendimentoId/unidades
* @access  Privado
*/
const createUnidadeController = asyncHandler(async (req, res, next) => {
    const { empreendimentoId } = req.params;
    const companyId = req.user.company;
    const unidadeData = req.body;

    if (!unidadeData.identificador) {
        return next(new ErrorResponse('O identificador da unidade é obrigatório.', 400));
    }

    const novaUnidade = await unidadeService.createUnidade(unidadeData, empreendimentoId, companyId);
    res.status(201).json({ success: true, data: novaUnidade });
});

/**  @desc    Listar todas as unidades de um empreendimento
* @route   GET /api/empreendimentos/:empreendimentoId/unidades
* @access  Privado
*/
const getUnidadesByEmpreendimentoController = asyncHandler(async (req, res, next) => {
    const { empreendimentoId } = req.params;
    const companyId = req.user.company;
    const { page = 1, limit = 100, ...filters } = req.query; // Default limit 100 para unidades

    const paginationOptions = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    delete filters.page;
    delete filters.limit;

    const result = await unidadeService.getUnidadesByEmpreendimento(empreendimentoId, companyId, filters, paginationOptions);
    res.status(200).json({ success: true, ...result });
});

/**  @desc    Buscar uma unidade específica por ID (dentro de um empreendimento)
* @route   GET /api/empreendimentos/:empreendimentoId/unidades/:unidadeId
* @access  Privado
*/
const getUnidadeByIdController = asyncHandler(async (req, res, next) => {
    const { empreendimentoId, unidadeId } = req.params;
    const companyId = req.user.company;

    const unidade = await unidadeService.getUnidadeById(unidadeId, empreendimentoId, companyId);

    if (!unidade) {
        return next(new ErrorResponse(`Unidade com ID ${unidadeId} não encontrada neste empreendimento ou empresa.`, 404));
    }
    res.status(200).json({ success: true, data: unidade });
});

/**  @desc    Atualizar uma unidade
* @route   PUT /api/empreendimentos/:empreendimentoId/unidades/:unidadeId
* @access  Privado
*/
const updateUnidadeController = asyncHandler(async (req, res, next) => {
    const { empreendimentoId, unidadeId } = req.params;
    const companyId = req.user.company;
    const updateData = req.body;

    const unidadeAtualizada = await unidadeService.updateUnidade(unidadeId, updateData, empreendimentoId, companyId);
    res.status(200).json({ success: true, data: unidadeAtualizada });
});

/** @desc    Desativar (soft delete) uma unidade
* @route   DELETE /api/empreendimentos/:empreendimentoId/unidades/:unidadeId
* @access  Privado
*/
const deleteUnidadeController = asyncHandler(async (req, res, next) => {
    const { empreendimentoId, unidadeId } = req.params;
    const companyId = req.user.company;

    const result = await unidadeService.deleteUnidade(unidadeId, empreendimentoId, companyId);
    res.status(200).json({ success: true, data: result });
});

module.exports = {
    createUnidadeController,
    getUnidadesByEmpreendimentoController,
    getUnidadeByIdController,
    updateUnidadeController,
    deleteUnidadeController
};