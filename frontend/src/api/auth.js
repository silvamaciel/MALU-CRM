import axiosInstance from "./axiosInstance.js";

/**
 * Envia o CÓDIGO DE AUTORIZAÇÃO do Google para o backend para troca por tokens e login/criação de usuário.
 * @param {string} authCode - O código de autorização obtido do hook useGoogleLogin.
 * @returns {Promise<object>} - Promessa que resolve com os dados retornados pelo backend (ex: token da sua API, dados do usuário).
 */
export const sendGoogleAuthCode = async (authCode) => { // Renomeado para clareza
  if (!authCode) {
    throw new Error("Código de autorização do Google não fornecido.");
  }
  try {
    // Envia o CÓDIGO no corpo da requisição como 'code'
    // O Backend /api/auth/google/callback precisará ser ajustado para esperar 'code' em vez de 'token'
    const response = await axiosInstance.post('/auth/google/callback', { code: authCode }); // <<< Envia { code: ... }
    console.log("Backend respondeu ao callback do Google:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao enviar código Google para o backend:", error.response?.data || error.message);
    const backendErrorMessage = error.response?.data?.error || error.response?.data?.message;
    const errorMessage = backendErrorMessage || "Falha na autenticação com o servidor.";
    throw new Error(errorMessage);
  }
};


/**
 * Envia email e senha para o endpoint de login local do backend.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - Objeto com { token, user }
 */
export const loginWithPassword = async (email, password) => {
  try {
    // Chama POST /api/auth/login
    const response = await axiosInstance.post("/auth/login", {
      email,
      senha: password,
    }); // Garante que envia 'senha'
    console.log("Backend respondeu ao login local:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro no login local:",
      error.response?.data || error.message
    );
    throw error.response?.data || new Error("Falha no login local.");
  }
};
