// services/authService.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Variáveis de ambiente
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Verifica se as variáveis essenciais estão carregadas
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !JWT_SECRET) {
    console.error("FATAL ERROR: Google Client ID/Secret ou JWT Secret não definidos no .env backend!");
}

// Cria o cliente OAuth2 uma vez
const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI 
);

/**
 * Processa o Código de Autorização do Google:
 * 1. Troca o código por tokens (Access, Refresh, ID).
 * 2. Verifica o ID token para pegar dados do usuário.
 * 3. Encontra o usuário no DB local (NÃO cria, exige pré-cadastro).
 * 4. Salva o Refresh Token (se recebido) no usuário do DB.
 * 5. Gera e retorna o token JWT da aplicação.
 * @param {string} authCode - O código de autorização recebido do frontend.
 * @returns {Promise<object>} - Objeto com { token: string, user: object }
 */
const processGoogleCode = async (authCode) => { // <<< Função renomeada/modificada
    console.log("[AuthService] Recebido Código de Autorização para processar...");
    if (!authCode) { throw new Error("Código de Autorização Google não fornecido."); }

    try {
        // 1. Trocar o código por tokens com o Google
        console.log("[AuthService] Trocando código por tokens...");
        const { tokens } = await client.getToken(authCode);
        console.log("[AuthService] Tokens recebidos do Google:", {
             access_token: tokens.access_token ? 'PRESENT' : 'MISSING',
             refresh_token: tokens.refresh_token ? 'PRESENT' : 'MISSING', // Refresh token só vem na primeira autorização offline
             id_token: tokens.id_token ? 'PRESENT' : 'MISSING',
             scope: tokens.scope,
             expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : 'N/A'
         });

        const idToken = tokens.id_token;
        if (!idToken) { throw new Error("ID Token não recebido do Google após troca de código."); }

        // 2. Verificar o ID Token para obter dados do usuário
        // (Alternativa: usar client.verifyIdToken, mas decodificar o token já obtido
        // da troca de código geralmente é seguro o suficiente aqui)
        console.log("[AuthService] Verificando ID Token recebido...");
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        console.log("[AuthService] Payload verificado:", payload);

        if (!payload || !payload.email) { throw new Error("Payload inválido ou email não encontrado no ID Token."); }
        const email = payload.email.toLowerCase();
        const googleUserId = payload.sub; // ID Google

        // 3. Encontrar usuário no DB local (lógica de não criar mantida)
        console.log(`[AuthService] Procurando usuário com email: ${email}`);
        // Precisamos buscar o usuário completo para poder salvar o refresh token
        let user = await User.findOne({ email: email }); // Não usar lean() aqui

        if (!user) {
            console.warn(`[AuthService] Tentativa de login Google com email não cadastrado: ${email}`);
            throw new Error('Usuário não autorizado ou não cadastrado.');
        }
         if (!user.company) { // Verifica se usuário encontrado tem empresa
             console.error(`[AuthService] ERRO DADOS: Usuário ${email} não tem empresa associada!`);
             throw new Error("Erro interno: Usuário sem empresa.");
         }
        console.log(`[AuthService] Usuário encontrado: ID=<span class="math-inline">\{user\.\_id\}, Empresa\=</span>{user.company}`);

        // 4. Salvar o Refresh Token (SE ele foi retornado pelo Google)
        if (tokens.refresh_token) {
            console.log(`[AuthService] Salvando Refresh Token para usuário ${user._id}`);
            user.googleRefreshToken = tokens.refresh_token;
            // Opcional: Atualizar googleId se não existir
            if (!user.googleId) user.googleId = googleUserId;
            await user.save(); // Salva o usuário com o refresh token
        } else {
             console.log(`[AuthService] Nenhum Refresh Token recebido do Google (provavelmente já foi concedido antes).`);
        }

        // 5. Gerar o Token JWT da Aplicação (payload igual antes)
        console.log(`[AuthService] Gerando token JWT para usuário ID: ${user._id}`);
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
        console.error("[AuthService] Erro no processamento do código Google:", error);
        // Pode ser erro na troca do token (ex: redirect_uri inválido no getToken),
        // ou na verificação, ou no save, ou usuário não autorizado
        throw new Error(error.message || "Falha ao processar autenticação Google.");
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
    processGoogleCode,
    loginUser
};