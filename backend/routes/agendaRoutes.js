const express = require('express');
const router = express.Router();
const { listarEventosLocais, sincronizarEventosGoogle, criarEventoLocal, deleteEventoAgenda } = require('../controllers/agendaController');
const { protect, authorize } = require('../middlewares/authMiddleware');



router.get('/', protect, listarEventosLocais);
router.post('/sync-google', protect, sincronizarEventosGoogle);
router.post('/', protect, criarEventoLocal);
router.delete('/:id', protect, deleteEventoAgenda);


module.exports = router;
