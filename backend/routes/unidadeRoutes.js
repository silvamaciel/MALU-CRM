// backend/routes/unidadeRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    createUnidadeController,
    getUnidadesByEmpreendimentoController,
    getUnidadeByIdController,
    updateUnidadeController,
    deleteUnidadeController
} = require('../controllers/unidadeController');
const { protect } = require('../middlewares/authMiddleware'); 


router.use(protect);

router.route('/')
    .post(createUnidadeController)
    .get(getUnidadesByEmpreendimentoController);

router.route('/:unidadeId')
    .get(getUnidadeByIdController)
    .put(updateUnidadeController)
    .delete(deleteUnidadeController);

module.exports = router;