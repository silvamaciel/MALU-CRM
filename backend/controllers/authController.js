// controllers/authController.js
const authService = require('../services/authService');

const googleCallback = async (req, res) => {
    // O frontend deve enviar o ID Token no corpo da requisição como 'token'
    const { token } = req.body;
    console.log("[AuthController] Recebido callback do Google, processando token...");

    if (!token) {
        return res.status(400).json({ error: 'Token do Google não fornecido no corpo da requisição.' });
    }

    try {
        // Chama o serviço para verificar o token e logar/criar usuário
        const result = await authService.verifyGoogleTokenAndLogin(token);
        // Retorna o token JWT da nossa aplicação e os dados do usuário
        res.json(result); // Ex: { token: 'nosso_jwt', user: { ... } }
    } catch (error) {
        console.error("[AuthController] Erro no callback do Google:", error.message);
        // Retorna um erro genérico ou específico
        res.status(401).json({ error: error.message || 'Autenticação falhou.' }); // 401 Unauthorized
    }
};


/**
 * 
 * Controller para login com e-mail/senha
 */

const loginUser = async (req, res) => {
    const { email, senha } = req.body; // Pega email e senha do corpo
    console.log("[AuthController] Recebido POST /api/auth/login");

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const result = await authService.loginUser(email, senha); // Chama o serviço
        res.json(result); // Retorna { token, user }
    } catch (error) {
        console.error("[AuthController] Erro no login local:", error.message);
        res.status(401).json({ error: error.message }); // Retorna 401 para credenciais inválidas ou outros erros
    }
};


module.exports = {
    googleCallback,
    loginUser,
};