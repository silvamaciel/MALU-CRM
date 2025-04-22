// services/authService.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Precisamos do modelo de usuário

// Pega o Client ID e o Segredo JWT das variáveis de ambiente
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // Padrão 1 dia

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verifica o ID Token do Google, encontra ou cria o usuário no DB local,
 * e gera um token JWT da nossa aplicação.
 * @param {string} idToken - O ID Token recebido do frontend (Google).
 * @returns {Promise<object>} - Objeto com { token: string, user: object }
 */
const verifyGoogleTokenAndLogin = async (idToken) => {
    console.log("[AuthService] Recebido ID Token para verificação...");
    if (!idToken) {
        throw new Error("ID Token do Google não fornecido.");
    }
    if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
         console.error("ERRO FATAL: GOOGLE_CLIENT_ID ou JWT_SECRET não definidos no .env do backend!");
         throw new Error("Erro de configuração do servidor.");
    }

    try {
        // 1. Verificar o token com o Google
        console.log("[AuthService] Verificando token com Google...");
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID, // Especifica para qual Client ID o token deve ser válido
        });
        const payload = ticket.getPayload();
        console.log("[AuthService] Payload do Google:", payload);

        // Verifica se conseguiu obter o payload e o email
        if (!payload || !payload.email) {
            throw new Error("Não foi possível obter informações do usuário do token Google.");
        }

        const googleUserId = payload.sub; // ID único do Google para este usuário
        const email = payload.email;
        const nome = payload.name || email.split('@')[0]; // Usa nome do Google ou parte do email
        const emailVerificado = payload.email_verified;

        // Opcional: Verificar se o email é de um domínio específico, se necessário
        // if (!email.endsWith('@seudominio.com')) { throw new Error("Domínio de email não autorizado."); }

        // 2. Encontrar ou Criar Usuário no nosso Banco de Dados
        console.log(`[AuthService] Procurando/Criando usuário para email: ${email}`);
        let user = await User.findOne({ email: email });

        if (!user) {
            // Se usuário não existe, cria um novo
            console.log(`[AuthService] Usuário não encontrado, criando novo...`);
            // Definir um perfil padrão, ex: 'corretor' ou 'cliente'
            // Você pode ajustar essa lógica conforme necessário
            const defaultProfile = 'corretor'; // Ajuste conforme sua lógica de perfil padrão
            user = new User({
                nome: nome,
                email: email,
                // googleId: googleUserId, // Opcional: Adicionar campo googleId ao Schema User para ligar contas
                perfil: defaultProfile, // Define um perfil padrão
                // Não definimos senha, pois é login via Google
            });
            await user.save();
            console.log(`[AuthService] Novo usuário criado com ID: ${user._id}`);
            // Ação de histórico para criação via Google? (Opcional)
            // logHistory(user._id, null, 'CRIACAO_GOOGLE', 'Usuário criado via Google Sign-In');
        } else {
            console.log(`[AuthService] Usuário encontrado com ID: ${user._id}`);
            // Opcional: Atualizar nome ou googleId se mudou?
            // if (!user.googleId) user.googleId = googleUserId;
            // if (user.nome !== nome) user.nome = nome;
            // await user.save();
        }

        // 3. Gerar o Token JWT da NOSSA Aplicação
        console.log(`[AuthService] Gerando token JWT para usuário ID: ${user._id}`);
        const jwtPayload = {
            userId: user._id,
            email: user.email,
            perfil: user.perfil,
            nome: user.nome
            // Adicione outros dados que você queira facilmente acessíveis no frontend
        };

        const token = jwt.sign(
            jwtPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log("[AuthService] Login bem-sucedido, retornando token e dados do usuário.");
        // Retorna o nosso token e os dados do usuário do nosso banco
        return {
            token: token,
            user: {
                _id: user._id,
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
            }
         };

    } catch (error) {
        console.error("[AuthService] Erro na verificação/login do Google:", error);
        // Trata erros específicos da biblioteca do Google ou outros erros
        if (error.message.includes("Token used too late") || error.message.includes("Invalid token signature")) {
             throw new Error("Token do Google inválido ou expirado.");
        }
        throw new Error(error.message || "Falha ao autenticar com Google.");
    }
};

module.exports = {
    verifyGoogleTokenAndLogin
};