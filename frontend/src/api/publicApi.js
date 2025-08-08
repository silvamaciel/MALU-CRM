import axios from 'axios';

// A URL base da sua API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://chatbotmmalu-malucrm.scyzx2.easypanel.host/api';

/**
 * Submete um novo lead a partir do formulário público de um parceiro.
 * @param {string} brokerToken - O token único do corretor.
 * @param {object} leadData - Os dados do lead (nome, email, contato).
 */
export const submitPublicLeadApi = async (brokerToken, leadData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/public/submit-lead/${brokerToken}`, leadData);
        return response.data;
    } catch (error) {
        console.error("Erro ao submeter lead:", error.response?.data || error.message);
        // Lança o erro para que o componente possa tratá-lo
        throw error.response?.data || new Error("Falha ao submeter o lead.");
    }
};