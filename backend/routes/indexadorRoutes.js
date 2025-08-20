const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const IndexadorController = require('../controllers/IndexadorController');

router.use(protect, authorize('admin'));

router.route('/')
    .get(IndexadorController.getIndexadores)
    .post(IndexadorController.createIndexador);

router.route('/:id/valores')
    .post(IndexadorController.upsertValor);

module.exports = router;