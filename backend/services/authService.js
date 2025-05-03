// services/authService.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Variáveis de ambiente
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Verifica se as variáveis essenciais estão carregadas
if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
    console.error("FATAL ERROR: GOOGLE_CLIENT_ID ou JWT_SECRET não definidos nas variáveis de ambiente do backend!");
    // Considerar encerrar o processo ou lançar um erro que impeça o start
    // process.exit(1); // Exemplo drástico
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verifica o ID Token do Google, ENCONTRA o usuário no DB local (que deve ter uma empresa associada),
 * e gera um token JWT da nossa aplicação contendo userId e companyId.
 * @param {string} idToken - O ID Token recebido do frontend (Google).
 * @returns {Promise<object>} - Objeto com { token: string, user: object }
 */
const verifyGoogleTokenAndLogin = async (idToken) => {
    console.log("[AuthService] Recebido ID Token para verificação...");
    if (!idToken) { throw new Error("ID Token do Google não fornecido."); }

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

        // 2. ENCONTRAR Usuário no nosso Banco de Dados PELO EMAIL
        console.log(`[AuthService] Procurando usuário com email: ${email}`);
        // Busca o usuário e já garante que o campo 'company' seja selecionado
        let user = await User.findOne({ email: email }).select('+company'); // Garante que company venha

        if (!user) {
            // Usuário NÃO encontrado no nosso banco
            console.warn(`[AuthService] Tentativa de login com email não cadastrado: ${email}`);
            throw new Error('Usuário não autorizado ou não cadastrado.'); // Erro porque não estamos criando user aqui
        }

        // <<< 3. VERIFICAR SE O USUÁRIO ENCONTRADO TEM UMA EMPRESA ASSOCIADA >>>
        if (!user.company) {
             console.error(`[AuthService] ERRO DE DADOS: Usuário ${user.email} (ID: ${user._id}) não possui uma empresa associada!`);
             // Isso indica um problema na criação/atualização desse usuário. Não deve acontecer se 'company' é required.
             throw new Error('Erro interno: Usuário sem empresa associada.');
        }
        console.log(`[AuthService] Usuário encontrado: ID=${user._id}, EmpresaID=${user.company}`);
        // <<< FIM DA VERIFICAÇÃO >>>

        // 4. Gerar o Token JWT da NOSSA Aplicação incluindo companyId
        console.log(`[AuthService] Gerando token JWT para usuário ID: ${user._id}`);
        const jwtPayload = {
            userId: user._id,
            email: user.email,
            perfil: user.perfil,
            nome: user.nome,
            companyId: user.company // <<< ADICIONADO companyId ao payload do token
        };

        const token = jwt.sign(
            jwtPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log("[AuthService] Login bem-sucedido, retornando token e dados do usuário (incluindo companyId).");
        // 5. Retornar nosso token e dados do usuário (incluindo companyId)
        return {
            token: token,
            user: { // Retorna dados seguros para o frontend
                _id: user._id,
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
                companyId: user.company // <<< ADICIONADO companyId à resposta
            }
         };

    } catch (error) {
        console.error("[AuthService] Erro na verificação/login:", error);
        if (error.message.includes("Token used too late") || error.message.includes("Invalid token signature")) {
             throw new Error("Token do Google inválido ou expirado.");
        }
        // Repassa o erro "Usuário não autorizado..." ou outros erros
        throw new Error(error.message || "Falha ao autenticar com Google.");
    }
};


/**
 * Autentica um usuário com email e senha.
 * @param {string} email - Email do usuário.
 * @param {string} password - Senha não hasheada fornecida.
 * @returns {Promise<object>} - Objeto com { token: string, user: object }
 */
const loginUser = async (email, password) => {
    console.log(`[AuthService] Tentativa de login local para email: ${email}`);
    if (!email || !password) {
        throw new Error("Email e Senha são obrigatórios.");
    }

    const emailLower = email.toLowerCase();

    try {
        // 1. Encontrar usuário pelo email E selecionar o campo senha
        const user = await User.findOne({ email: emailLower }).select('+senha +company'); // <<< Seleciona senha e company!

        // 2. Verificar se usuário existe E se tem senha cadastrada
        if (!user || !user.senha) {
             console.warn(`[AuthService] Usuário não encontrado ou sem senha local: ${emailLower}`);
             throw new Error("Credenciais inválidas."); // Mensagem genérica por segurança
        }
         // 3. Verificar se a empresa existe (importante para multi-tenant)
         if (!user.company) {
            console.error(`[AuthService] ERRO DADOS: Usuário ${user.email} não tem empresa associada!`);
            throw new Error("Erro interno: Usuário sem empresa.");
         }

        // 4. Comparar a senha fornecida com o hash no banco
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.warn(`[AuthService] Senha incorreta para: ${emailLower}`);
            throw new Error("Credenciais inválidas."); // Mensagem genérica
        }

        // 5. Se chegou aqui, senha está correta! Gerar token JWT (igual ao do Google Login)
        console.log(`[AuthService] Senha correta. Gerando token JWT para user: ${user._id}, company: ${user.company}`);
        const jwtPayload = {
            userId: user._id, email: user.email, perfil: user.perfil,
            nome: user.nome, companyId: user.company
        };
        const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // 6. Retornar token e dados do usuário
        return {
            token: token,
            user: { _id: user._id, nome: user.nome, email: user.email, perfil: user.perfil, companyId: user.company }
        };

    } catch (error) {
        // Repassa erros específicos ou lança um genérico
        console.error("[AuthService] Erro no login local:", error);
        throw new Error(error.message || "Falha no login.");
    }
};


module.exports = {
    verifyGoogleTokenAndLogin
};