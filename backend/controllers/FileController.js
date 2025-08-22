const asyncHandler = require('../middlewares/asyncHandler');
const FileService = require('../services/FileService');

const uploadArquivoController = asyncHandler(async (req, res) => {
    // O 'req.file' é o ficheiro que foi carregado para o DigitalOcean Spaces.
    // O 'req.body' contém os outros campos do formulário (categoria, associations).
    const arquivo = await FileService.registrarArquivo(req.file, req.body, req.user.company, req.user._id);
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

module.exports = {
    uploadArquivoController,
    listarArquivosController,
    apagarArquivoController
};