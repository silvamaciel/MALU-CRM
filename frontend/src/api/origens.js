// src/api/origens.js
import axiosInstance from "./axiosInstance.js"; // Verifique se o nome axiosInstance.js está correto

// Define a URL base para esta entidade (confirme se é /origens no seu backend)
const API_URL = '/origens';

/**
 * Busca todas as origens de lead.
 * @returns {Promise<Array>} Array com as origens.
 */
export const getOrigens = async () => {
  try {
    const response = await axiosInstance.get(API_URL);
    // Garante retorno de array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar origens:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao buscar origens.');
  }
};

/**
 * Cria uma nova origem de lead.
 * @param {object} originData - Dados da nova origem (ex: { nome: 'Nova Origem', descricao: '...' }).
 * @returns {Promise<object>} A origem criada.
 */
export const createOrigem = async (originData) => { // <<< Função que estava faltando
    try {
        const response = await axiosInstance.post(API_URL, originData);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar origem:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar origem.");
    }
};

/**
 * Atualiza uma origem de lead existente.
 * @param {string} id - ID da origem a ser atualizada.
 * @param {object} updateData - Dados a serem atualizados (ex: { nome: 'Nome Atualizado', descricao: '...' }).
 * @returns {Promise<object>} A origem atualizada.
 */
export const updateOrigem = async (id, updateData) => { // <<< Função que estava faltando
    if (!id) throw new Error("ID é necessário para atualizar a origem.");
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar origem ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar origem.");
    }
};

/**
 * Exclui uma origem de lead.
 * @param {string} id - ID da origem a ser excluída.
 * @returns {Promise<object>} Resposta da API (geralmente uma mensagem de sucesso).
 */
export const deleteOrigem = async (id) => { // <<< Função que estava faltando
    if (!id) throw new Error("ID é necessário para excluir a origem.");
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data; // Ex: { message: "Origem excluída..." }
    } catch (error) {
        console.error(`Erro ao excluir origem ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir origem.");
    }
};

export const ensureOrigemApi = async (nome, companyId, descricao) => {
  const { data } = await axiosInstance.post('/origens/ensure', { nome, companyId, descricao });
  return data?.data;
};