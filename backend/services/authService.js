// services/authService.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Modelo de usuário

// Variáveis de ambiente
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verifica o ID Token do Google, ENCONTRA (não cria) o usuário no DB local,
 * e gera um token JWT da nossa aplicação.
 * @param {string} idToken - O ID Token recebido do frontend (Google).
 * @returns {Promise<object>} - Objeto com { token: string, user: object }
 */
const verifyGoogleTokenAndLogin = async (idToken) => {
    console.log("[AuthService] Recebido ID Token para verificação...");
    if (!idToken) { throw new Error("ID Token do Google não fornecido."); }
    if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
         console.error("ERRO FATAL: GOOGLE_CLIENT_ID ou JWT_SECRET não definidos!");
         throw new Error("Erro de configuração do servidor.");
    }

    try {
        // 1. Verificar o token com o Google
        console.log("[AuthService] Verificando token com Google...");
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        console.log("[AuthService] Payload do Google:", payload);

        if (!payload || !payload.email) {
            throw new Error("Não foi possível obter informações do usuário do token Google.");
        }

        const email = payload.email;
        const nomeGoogle = payload.name; // Pega o nome vindo do Google

        // 2. ENCONTRAR Usuário no nosso Banco de Dados PELO EMAIL
        console.log(`[AuthService] Procurando usuário com email: ${email}`);
        let user = await User.findOne({ email: email }); // Procura pelo email

        // <<< INÍCIO DA ALTERAÇÃO >>>
        if (!user) {
            // Se usuário NÃO for encontrado, LANÇA ERRO
            console.warn(`[AuthService] Tentativa de login com email não cadastrado: ${email}`);
            throw new Error('Usuário não autorizado ou não cadastrado.');
            // Bloco que criava usuário foi REMOVIDO daqui!
        }
        // <<< FIM DA ALTERAÇÃO >>>

        // Se chegou aqui, o usuário FOI encontrado
        console.log(`[AuthService] Usuário encontrado com ID: ${user._id}, Nome no DB: ${user.nome}`);
        // Opcional: Atualizar o nome no DB com o nome mais recente do Google?
        // if (user.nome !== nomeGoogle && nomeGoogle) {
        //     user.nome = nomeGoogle;
        //     await user.save();
        //     console.log(`[AuthService] Nome do usuário ${user._id} atualizado para ${nomeGoogle}`);
        // }

        // 3. Gerar o Token JWT da NOSSA Aplicação (igual antes)
        console.log(`[AuthService] Gerando token JWT para usuário ID: ${user._id}`);
        const jwtPayload = {
            userId: user._id,
            email: user.email,
            perfil: user.perfil,
            nome: user.nome // Usa o nome do nosso DB
        };
        const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log("[AuthService] Login bem-sucedido, retornando token e dados.");
        return {
            token: token,
            user: { // Retorna dados do usuário do nosso DB
                _id: user._id,
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
            }
         };

    } catch (error) {
        console.error("[AuthService] Erro na verificação/login:", error);
        // Retorna mensagens de erro mais específicas se possível
        if (error.message.includes("Token used too late") || error.message.includes("Invalid token signature")) {
             throw new Error("Token do Google inválido ou expirado.");
        }
        // Repassa o erro "Usuário não autorizado..." ou outros erros
        throw new Error(error.message || "Falha ao autenticar com Google.");
    }
};

module.exports = {
    verifyGoogleTokenAndLogin
};