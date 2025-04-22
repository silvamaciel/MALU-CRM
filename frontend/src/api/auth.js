import axiosInstance from './axiosInstante.js'; 

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
      // <<< IMPORTANTE: Este endpoint /api/auth/google/callback PRECISA SER CRIADO no seu backend >>>
      const response = await axiosInstance.post('/auth/google/callback', { token: idToken });
      // Espera-se que o backend retorne algo útil, como o token JWT da SUA aplicação
      // e talvez informações do usuário do seu banco de dados.
      console.log("Backend respondeu ao login do Google:", response.data);
      return response.data; // Ex: { token: "seu_jwt_aqui", user: { ... } }
    } catch (error) {
      console.error("Erro ao enviar token do Google para o backend:", error.response?.data || error.message);
      throw error.response?.data || new Error("Falha na autenticação com o servidor.");
    }
  };