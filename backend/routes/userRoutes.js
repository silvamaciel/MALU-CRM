// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, UserController.getCompanyUsers);

router.post('/', protect, authorize('admin'), UserController.createUser);

router.put('/:id', protect, authorize('admin'), UserController.updateUser);

router.get('/:id', protect, UserController.getUserById);

router.delete('/:id', protect, authorize('admin'), UserController.deleteUser);

module.exports = router;