// src/api/empreendimentoApi.js
import axiosInstance from "./axiosInstance";

const API_URL = '/empreendimentos';

/**
 * Busca empreendimentos com paginação e filtros.
 * @param {number} page - Número da página.
 * @param {number} limit - Limite de itens por página.
 * @param {object} filters - Objeto com os filtros a serem aplicados.
 * @returns {Promise<object>} Resposta da API contendo { empreendimentos, total, page, pages }.
 */
export const getEmpreendimentos = async (page = 1, limit = 10, filters = {}) => {
    try {
        const params = { page, limit, ...filters };
        // Remove chaves de filtro com valores vazios ou nulos para não enviar à API
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null || params[key] === undefined) && delete params[key]);
        
        const response = await axiosInstance.get(API_URL, { params });
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar empreendimentos:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar empreendimentos.");
    }
};

/**
 * Busca um empreendimento específico pelo ID.
 * @param {string} id - ID do empreendimento.
 * @returns {Promise<object>} O empreendimento encontrado.
 */
export const getEmpreendimentoById = async (id) => {
    try {
        const response = await axiosInstance.get(`${API_URL}/${id}`);
        return response.data.data; // O backend retorna { success: true, data: empreendimento }
    } catch (error) {
        console.error(`Erro ao buscar empreendimento ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar o empreendimento.");
    }
};

/**
 * Cria um novo empreendimento.
 * @param {object} empreendimentoData - Dados do novo empreendimento.
 * @returns {Promise<object>} O empreendimento criado.
 */
export const createEmpreendimento = async (empreendimentoData) => {
    try {
        const response = await axiosInstance.post(API_URL, empreendimentoData);
        return response.data.data; // O backend retorna { success: true, data: novoEmpreendimento }
    } catch (error) {
        console.error("Erro ao criar empreendimento:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar o empreendimento.");
    }
};

/**
 * Atualiza um empreendimento existente.
 * @param {string} id - ID do empreendimento a ser atualizado.
 * @param {object} empreendimentoData - Dados para atualizar o empreendimento.
 * @returns {Promise<object>} O empreendimento atualizado.
 */
export const updateEmpreendimento = async (id, empreendimentoData) => {
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, empreendimentoData);
        return response.data.data; // O backend retorna { success: true, data: empreendimentoAtualizado }
    } catch (error) {
        console.error(`Erro ao atualizar empreendimento ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar o empreendimento.");
    }
};

/**
 * Desativa (soft delete) um empreendimento.
 * @param {string} id - ID do empreendimento a ser desativado.
 * @returns {Promise<object>} Mensagem de sucesso.
 */
export const deleteEmpreendimento = async (id) => {
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data; // O backend retorna { success: true, data: { message: "..." } }
    } catch (error) {
        console.error(`Erro ao desativar empreendimento ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao desativar o empreendimento.");
    }
};