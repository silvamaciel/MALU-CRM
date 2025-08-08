import axios from 'axios';

// A URL base da sua API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://chatbotmmalu-malucrm.scyzx2.easypanel.host/api';

/**
 * Verifica se um corretor parceiro existe com base no CPF ou CRECI.
 * @param {string} identifier - O CPF ou CRECI a ser verificado.
 */
export const checkBrokerApi = async (identifier) => {
    try {
         const response = await axios.post(`${API_BASE_URL}/public/broker/check`, { identifier, companyId });
        return response.data.data; // Retorna { exists: true/false, broker: {...} }
    } catch (error) {
        console.error("Erro ao verificar parceiro:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao verificar o parceiro.");
    }
};

/**
 * Regista um novo corretor parceiro.
 * @param {string} companyId - O ID da empresa.
 * @param {object} brokerData - Os dados do corretor (nome, email, cpfCnpj, etc.).
 */
export const registerBrokerApi = async (companyId, brokerData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/public/broker/register/${companyId}`, brokerData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao registar parceiro:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao registar o parceiro.");
    }
};

/**
 * Submete um novo lead a partir do formulário público.
 * @param {string} brokerToken - O token de submissão do corretor.
 * @param {object} leadData - Os dados do lead.
 */
export const submitPublicLeadApi = async (brokerToken, leadData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/public/submit-lead/${brokerToken}`, leadData);
        return response.data;
    } catch (error) {
        console.error("Erro ao submeter lead:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao submeter o lead.");
    }
};