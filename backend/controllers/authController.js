// controllers/authController.js
const authService = require('../services/authService');

const googleCallback = async (req, res) => {
    const { code } = req.body;
    console.log("[AuthController] Recebido callback do Google, processando código...");

    if (!code) {
        return res.status(400).json({ error: 'Código de autorização Google não fornecido.' });
    }

    try {
        // <<< Chama a nova função do serviço >>>
        const result = await authService.processGoogleCode(code);
        res.json(result); // Retorna { token, user }

    } catch (error) {
        console.error("[AuthController] Erro no callback do Google:", error.message);
        // Retorna 401 para falhas de autenticação/autorização
        res.status(401).json({ error: error.message || 'Autenticação Google falhou.' });
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
    loginUser
};