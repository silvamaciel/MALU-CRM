// src/api/leadStage.js
import axiosInstance from "./axiosInstance.js"; // <<< CORRIGIDO o typo aqui

// Define a URL base para esta entidade (confirme se é /leadStage no seu backend)
const API_URL = '/leadStage';

/**
 * Busca todas as situações de lead.
 * (Sua função existente, mantida)
 * @returns {Promise<Array>} Array com as situações.
 */
export const getLeadStages = async () => {
  try {
    const response = await axiosInstance.get(API_URL);
    // Garante que retorna um array mesmo se a resposta for inesperada
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar situações:', error.response?.data || error.message);
    // Lança um erro que pode ser pego pelo componente que chamou
    throw error.response?.data || new Error('Falha ao buscar situações.');
  }
};

// <<< FUNÇÃO ADICIONADA: Criar Situação >>>
/**
 * Cria uma nova situação de lead.
 * @param {object} stageData - Dados da nova situação (ex: { nome: 'Nova', ordem: 1 }).
 * @returns {Promise<object>} A situação criada.
 */
export const createLeadStage = async (stageData) => {
    try {
        const response = await axiosInstance.post(API_URL, stageData);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar situação:", error.response?.data || error.message);
        // Tenta repassar o erro específico do backend ({ error: "mensagem" })
        throw error.response?.data || new Error("Falha ao criar situação.");
    }
};

// <<< FUNÇÃO ADICIONADA: Atualizar Situação >>>
/**
 * Atualiza uma situação de lead existente.
 * @param {string} id - ID da situação a ser atualizada.
 * @param {object} updateData - Dados a serem atualizados (ex: { nome: 'Atualizada' }).
 * @returns {Promise<object>} A situação atualizada.
 */
export const updateLeadStage = async (id, updateData) => {
    if (!id) throw new Error("ID é necessário para atualizar a situação.");
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar situação ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar situação.");
    }
};

// <<< FUNÇÃO ADICIONADA: Excluir Situação >>>
/**
 * Exclui uma situação de lead.
 * @param {string} id - ID da situação a ser excluída.
 * @returns {Promise<object>} Resposta da API (geralmente uma mensagem de sucesso).
 */
export const deleteLeadStage = async (id) => {
    if (!id) throw new Error("ID é necessário para excluir a situação.");
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data; // Ex: { message: "Situação excluída..." }
    } catch (error) {
        console.error(`Erro ao excluir situação ${id}:`, error.response?.data || error.message);
        // Repassa o erro do backend (pode ser "Situação em uso...")
        throw error.response?.data || new Error("Falha ao excluir situação.");
    }
};


/**
 * Atualiza a ordem das situações de lead para a empresa.
 * @param {string[]} orderedStageIds - Array de IDs de LeadStage na nova ordem.
 * @returns {Promise<object>} Resposta da API.
 */
export const updateLeadStagesOrderApi = async (orderedStageIds) => {
    try {
        const response = await axiosInstance.put(`${API_URL}/order`, { orderedStageIds });
        return response.data; // Espera { success: true, message: "..." }
    } catch (error) {
        console.error("Erro ao atualizar ordem das situações:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar a ordem das situações.");
    }
};