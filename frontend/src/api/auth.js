import axiosInstance from "./axiosInstance.js";

/**
 * Envia o token de ID do Google para o backend para validação e login/criação de usuário.
 * @param {string} idToken - O token JWT obtido do Google Sign-In.
 * @returns {Promise<object>} - Promessa que resolve com os dados retornados pelo backend (ex: token da sua API, dados do usuário).
 */
export const loginWithGoogle = async (idToken) => {
  if (!idToken) {
    throw new Error("Token de ID do Google não fornecido.");
  }
  try {
    const response = await axiosInstance.post("/auth/google/callback", {
      token: idToken,
    });
    console.log("Backend respondeu ao login do Google:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao enviar token do Google para o backend:",
      error.response || error
    );

    // Tenta pegar a mensagem de erro específica enviada pelo backend ({ error: "mensagem" })
    const backendErrorMessage =
      error.response?.data?.error || error.response?.data?.message;

    // Se encontrou uma mensagem específica do backend, usa ela. Senão, usa a genérica.
    const errorMessage =
      backendErrorMessage || "Falha na autenticação com o servidor.";

    // Joga um NOVO erro com a mensagem correta
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
