const express = require('express');
const router = express.Router();
const FileController = require('../controllers/FileController');
const { upload } = require('../config/s3');

// NADA de auth aqui

// Lista (GET /api/files)
router.get('/', FileController.listarArquivosController);

// Upload (POST /api/files/upload) - campo 'arquivo'
router.post('/upload', upload.single('arquivo'), FileController.uploadArquivoController);

// Preview (GET /api/files/:id/preview)  << CORRETO
router.get('/:id/preview', FileController.previewArquivoController);

// Delete (DELETE /api/files/:id)
router.delete('/:id', FileController.apagarArquivoController);

module.exports = router;
