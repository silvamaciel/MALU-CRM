// backend/routes/reservaRoutes.js
const express = require('express');
const router = express.Router();
const { createReservaController } = require('../controllers/ReservaController'); // Ajuste o nome para corresponder ao seu arquivo
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);


router.route('/')
    .post(createReservaController);

router.route('/:id').get(getReservaByIdController);
router.route('/lead/:leadId').get(listReservasByLeadController);
router.route('/:id/status').put(updateReservaStatusController);

module.exports = router;