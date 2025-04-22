// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para receber o callback do Google Sign-In do frontend
router.post('/google/callback', authController.googleCallback);

// Adicione aqui rotas para /register e /login se implementar login com senha
// router.post('/register', authController.registerUser);
// router.post('/login', authController.loginUser);

module.exports = router;