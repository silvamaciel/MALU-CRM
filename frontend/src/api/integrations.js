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


/**
 * Busca o status atual da integração com o Facebook para a empresa do usuário.
 * @returns {Promise<object>} Objeto com { isConnected: boolean, pageId?: string, pageName?: string }
 */
export const getFacebookConnectionStatus = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}/facebook/status`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar status da conexão Facebook:', error.response?.data || error.message);
        return { isConnected: false, error: error.response?.data?.error || "Falha ao buscar status." };
    }
};



/**
 * Solicita ao backend para desconectar a página do Facebook atualmente integrada.
 * @returns {Promise<object>} Resposta do backend (mensagem de sucesso).
 */
export const disconnectFacebookPage = async () => {
    try {
        const response = await axiosInstance.post(`${API_URL}/facebook/disconnect`);
        return response.data;
    } catch (error) {
        console.error('Erro ao desconectar página do Facebook:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao desconectar página do Facebook.');
    }
};

