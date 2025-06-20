const asyncHandler = require('../middlewares/asyncHandler');
const ImovelAvulsoService = require('../services/ImovelAvulsoService');
const ErrorResponse = require('../utils/errorResponse');

const create = asyncHandler(async (req, res, next) => {
    const imovel = await ImovelAvulsoService.createImovel(req.body, req.user.company, req.user._id);
    res.status(201).json({ success: true, data: imovel });
});

const getAll = asyncHandler(async (req, res, next) => {
    const result = await ImovelAvulsoService.getImoveis(req.user.company, req.query);
    res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res, next) => {
    const imovel = await ImovelAvulsoService.getImovelById(req.params.id, req.user.company);
    if (!imovel) return next(new ErrorResponse(`Imóvel com ID ${req.params.id} não encontrado.`, 404));
    res.status(200).json({ success: true, data: imovel });
});

const update = asyncHandler(async (req, res, next) => {
    const imovel = await ImovelAvulsoService.updateImovel(req.params.id, req.body, req.user.company);
    res.status(200).json({ success: true, data: imovel });
});

const remove = asyncHandler(async (req, res, next) => {
    await ImovelAvulsoService.deleteImovel(req.params.id, req.user.company);
    res.status(200).json({ success: true, data: {} });
});

module.exports = { create, getAll, getById, update, remove };