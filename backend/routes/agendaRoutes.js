const express = require('express');
const router = express.Router();
const { listarEventosLocais, sincronizarEventosGoogle } = require('../controllers/agendaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, listarEventosLocais);
router.post('/sync-google', authMiddleware, sincronizarEventosGoogle);

module.exports = router;
