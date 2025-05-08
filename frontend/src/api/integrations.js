// src/api/integrations.js
import axiosInstance from "./axiosInstance.js";

const API_URL = '/integrations'; // Base URL para endpoints de integração

/**
 * Envia os dados da página do Facebook selecionada e o token de acesso do usuário
 * para o backend finalizar a conexão e configurar o webhook.
 * @param {string} pageId - O ID da Página do Facebook selecionada.
 * @param {string} userAccessToken - O token de acesso do usuário obtido do Facebook Login.
 * @returns {Promise<object>} Resposta do backend (ex: mensagem de sucesso).
 */
export const connectFacebookPage = async (pageId, userAccessToken) => {
    if (!pageId || !userAccessToken) {
        throw new Error("ID da Página e Token de Acesso são necessários.");
    }
    try {
        const response = await axiosInstance.post(`${API_URL}/facebook/connect-page`, {
            pageId: pageId,
            accessToken: userAccessToken // Envia o token do USUÁRIO
        });
        return response.data;
    } catch (error) {
        console.error('Erro ao conectar página do Facebook no backend:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao finalizar conexão com Facebook.');
    }
};

// Adicione outras funções de API de integração aqui no futuro