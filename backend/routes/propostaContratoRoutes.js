// backend/routes/propostaContratoRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createPropostaContratoController,
    getPropostaContratoByIdController,
    downloadPropostaContratoPDFController,
    updatePropostaContratoController,
    updateStatusPropostaContratoController
 } = require('../controllers/PropostaContratoController'); // Ajuste o nome do arquivo se necessário
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas serão protegidas
router.use(protect);

// Rota para criar uma nova Proposta/Contrato a partir de uma Reserva específica
// POST /api/propostas-contratos/a-partir-da-reserva/:reservaId
// (Usando um nome de rota mais descritivo para esta ação específica)
router.route('/a-partir-da-reserva/:reservaId')
    .post(createPropostaContratoController);

router.route('/:id')
    .get(getPropostaContratoByIdController)
    .put(updatePropostaContratoController);


router.route('/:id/pdf')
    .get(downloadPropostaContratoPDFController)


router.route('/:id/status')
    .put(updateStatusPropostaContratoController);

// Rota alternativa se você quiser uma rota base /api/propostas-contratos e passar reservaId no corpo
// router.route('/')
//     .post(createPropostaContratoController); 

// No futuro, outras rotas para PropostaContrato:
// router.route('/').get(listPropostasContratosController);
// router.route('/:id/status').put(updateStatusPropostaContratoController);

module.exports = router;