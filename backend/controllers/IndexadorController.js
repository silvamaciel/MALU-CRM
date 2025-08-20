const asyncHandler = require('../middlewares/asyncHandler');
const IndexadorService = require('../services/IndexadorService');

const getIndexadores = asyncHandler(async (req, res) => {
    const indexadores = await IndexadorService.getIndexadores(req.user.company);
    res.status(200).json({ success: true, data: indexadores });
});

const createIndexador = asyncHandler(async (req, res) => {
    const indexador = await IndexadorService.createIndexador(req.body, req.user.company);
    res.status(201).json({ success: true, data: indexador });
});

const upsertValor = asyncHandler(async (req, res) => {
    const indexador = await IndexadorService.upsertValorIndexador(req.params.id, req.body, req.user.company);
    res.status(200).json({ success: true, data: indexador });
});

module.exports = { getIndexadores, createIndexador, upsertValor };