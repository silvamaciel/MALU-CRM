const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const FileController = require('../controllers/FileController');
const { upload } = require('../config/s3'); // <<< Importa o nosso middleware de upload

// Todas as rotas de ficheiros são protegidas
router.use(protect);

// Rota para listar todos os ficheiros (com filtros)
router.get('/', FileController.listarArquivosController);

// Rota para fazer o upload de um único ficheiro.
// O middleware 'upload.single('arquivo')' processa o ficheiro antes de chegar ao controller.
// 'arquivo' deve ser o nome do campo no formulário do frontend.
router.post('/upload', upload.single('arquivo'), FileController.uploadArquivoController);

// Rota para apagar um ficheiro
router.delete('/:id', FileController.apagarArquivoController);

router.get('/files/:id/preview', FileController.previewArquivoController)


module.exports = router;