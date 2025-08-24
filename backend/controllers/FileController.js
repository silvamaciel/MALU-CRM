const asyncHandler = require('../middlewares/asyncHandler');
const FileService = require('../services/FileService');

const uploadArquivoController = asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.primaryAssociation === 'string') {
        try { body.primaryAssociation = JSON.parse(body.primaryAssociation); } catch { }
    }
    const arquivo = await FileService.registrarArquivo(req.file, body, req.user.company, req.user._id);
    res.status(201).json({ success: true, data: arquivo });
});

const listarArquivosController = asyncHandler(async (req, res) => {
    // Passa os filtros da query string (ex: ?categoria=Contratos) para o serviço
    const arquivos = await FileService.listarArquivos(req.user.company, req.query);
    res.status(200).json({ success: true, count: arquivos.length, data: arquivos });
});

const apagarArquivoController = asyncHandler(async (req, res) => {
    const result = await FileService.apagarArquivo(req.params.id, req.user.company);
    res.status(200).json({ success: true, data: result });
});

const previewArquivoController = asyncHandler(async (req, res) => {
    const { stream, contentType, filename } = await FileService.getPreviewStream(
        req.params.id,
        req.user.company
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    stream.pipe(res);
});


module.exports = {
    uploadArquivoController,
    listarArquivosController,
    apagarArquivoController,
    previewArquivoController
};