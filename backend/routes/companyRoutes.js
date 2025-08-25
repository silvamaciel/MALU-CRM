const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const CompanyController = require('../controllers/CompanyController');


router.post('/', CompanyController.createCompany);

router.use(protect);

router.route('/settings')
    .get(authorize('admin'), CompanyController.getCompanySettingsController)
    .put(authorize('admin'), CompanyController.updateCompanySettingsController);



module.exports = router;