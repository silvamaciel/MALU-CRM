// src/api/discardReasons.js
import axiosInstance from './axiosInstance.js'; // Verifique o nome do arquivo axiosInstance

// Define a URL base para esta entidade (confirme se é /motivosdescarte no backend)
const API_URL = '/motivosdescarte';

/**
 * Busca todos os motivos de descarte (filtrado por empresa no backend).
 * @returns {Promise<Array>} Array com os motivos.
 */
export const getDiscardReasons = async () => {
  try {
    const response = await axiosInstance.get(API_URL);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar motivos de descarte:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao buscar motivos de descarte.');
  }
};

/**
 * Cria um novo motivo de descarte.
 * @param {object} reasonData - Dados do novo motivo (ex: { nome: 'Sem Budget', descricao: '...' }).
 * @returns {Promise<object>} O motivo criado.
 */
export const createDiscardReason = async (reasonData) => { // <<< Função que estava faltando
    try {
        const response = await axiosInstance.post(API_URL, reasonData);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar motivo:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar motivo.");
    }
};

/**
 * Atualiza um motivo de descarte existente.
 * @param {string} id - ID do motivo a ser atualizado.
 * @param {object} updateData - Dados a serem atualizados (ex: { nome: 'Nome Atualizado', descricao: '...' }).
 * @returns {Promise<object>} O motivo atualizado.
 */
export const updateDiscardReason = async (id, updateData) => { // <<< Função que estava faltando
    if (!id) throw new Error("ID é necessário para atualizar o motivo.");
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar motivo ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar motivo.");
    }
};

/**
 * Exclui um motivo de descarte.
 * @param {string} id - ID do motivo a ser excluído.
 * @returns {Promise<object>} Resposta da API (geralmente uma mensagem de sucesso).
 */
export const deleteDiscardReason = async (id) => { // <<< Função que estava faltando
    if (!id) throw new Error("ID é necessário para excluir o motivo.");
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data; // Ex: { message: "Motivo excluído..." }
    } catch (error) {
        console.error(`Erro ao excluir motivo ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir motivo.");
    }
};