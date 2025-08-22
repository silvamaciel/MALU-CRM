const asyncHandler = require('../middlewares/asyncHandler');
const FileService = require('../services/FileService');

const uploadArquivoController = asyncHandler(async (req, res) => {
    // A validação do ficheiro e o upload são feitos pelo middleware 'upload.single()'.
    // Se chegarmos aqui, o upload foi bem-sucedido.
    const arquivo = await FileService.registrarArquivo(req.file, req.user.company, req.user._id);
    res.status(201).json({ success: true, data: arquivo });
});

const listarArquivosController = asyncHandler(async (req, res) => {
    const arquivos = await FileService.listarArquivos(req.user.company);
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