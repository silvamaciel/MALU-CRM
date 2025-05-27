// backend/controllers/ModeloContratoController.js
const asyncHandler = require('../middlewares/asyncHandler');
const ModeloContratoService = require('../services/ModeloContratoService');
const ErrorResponse = require('../utils/errorResponse');
/** 
* @desc    Criar um novo modelo de contrato
* @route   POST /api/modelos-contrato
* @access  Privado (Admin da empresa)
*/
const createModeloContratoController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    // Idealmente, apenas usuários com perfil 'admin' da empresa podem criar/gerenciar modelos
    // Isso pode ser reforçado com o middleware authorize(['admin']) na rota
    const novoModelo = await ModeloContratoService.createModeloContrato(req.body, companyId);
    res.status(201).json({ success: true, data: novoModelo });
});

/**  
* @desc Listar todos os modelos de contrato da empresa
* @route   GET /api/modelos-contrato
* @access  Privado
*/
const getModelosContratoController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const { page = 1, limit = 10, ...filters } = req.query;
    const paginationOptions = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    delete filters.page; delete filters.limit;

    const result = await ModeloContratoService.getModelosContratoByCompany(companyId, filters, paginationOptions);
    res.status(200).json({ success: true, ...result });
});
/** 
* @desc    Buscar um modelo de contrato por ID
* @route   GET /api/modelos-contrato/:id
* @access  Privado
*/
const getModeloContratoByIdController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const modelo = await ModeloContratoService.getModeloContratoById(req.params.id, companyId);
    if (!modelo) {
        return next(new ErrorResponse(`Modelo de Contrato com ID ${req.params.id} não encontrado.`, 404));
    }
    res.status(200).json({ success: true, data: modelo });
});
/**
 * @desc    Atualizar um modelo de contrato
 * @route   PUT /api/modelos-contrato/:id
 * @access  Privado (Admin da empresa) 
*/
const updateModeloContratoController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const modeloAtualizado = await ModeloContratoService.updateModeloContrato(req.params.id, req.body, companyId);
    res.status(200).json({ success: true, data: modeloAtualizado });
});

/**
 * @desc    Desativar (soft delete) um modelo de contrat
 * @route   DELETE /api/modelos-contrato/:id
 * @access  Privado (Admin da empresa)
 */
const deleteModeloContratoController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const result = await ModeloContratoService.deleteModeloContrato(req.params.id, companyId);
    res.status(200).json({ success: true, data: result });
});

module.exports = {
    createModeloContratoController,
    getModelosContratoController,
    getModeloContratoByIdController,
    updateModeloContratoController,
    deleteModeloContratoController
};