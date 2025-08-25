// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect } = require('../middlewares/authMiddleware');


router.post('/', companyController.createCompany);



router.route('/settings')
    .get(companyController.getCompanySettingsController)
    .put(companyController.updateCompanySettingsController);



module.exports = router;