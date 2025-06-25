const express = require('express');
const router = express.Router();
const { listarEventosLocais, sincronizarEventosGoogle } = require('../controllers/agendaController');
const { protect, authorize } = require('../middlewares/authMiddleware');



router.get('/', protect, listarEventosLocais);
router.post('/sync-google', protect, sincronizarEventosGoogle);

module.exports = router;
