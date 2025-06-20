const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const ImovelAvulsoController = require('../controllers/ImovelAvulsoController');

router.use(protect);

router.route('/')
    .post(ImovelAvulsoController.create)
    .get(ImovelAvulsoController.getAll);

router.route('/:id')
    .get(ImovelAvulsoController.getById)
    .put(ImovelAvulsoController.update)
    .delete(ImovelAvulsoController.remove);

module.exports = router;