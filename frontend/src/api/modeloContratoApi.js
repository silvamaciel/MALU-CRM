// src/api/modeloContratoApi.js
import axiosInstance from "./axiosInstance"; // Seu interceptor do Axios

const API_URL = '/modelos-contrato'; // Base URL para esta entidade

/**
 * Busca modelos de contrato com paginação e filtros.
 */
export const getModelosContrato = async (page = 1, limit = 10, filters = {}) => {
    try {
        const params = { page, limit, ...filters };
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null || params[key] === undefined) && delete params[key]);

        const response = await axiosInstance.get(API_URL, { params });
        return response.data; // Espera { success: true, modelos: [], total: X, page: Y, pages: Z }
    } catch (error) {
        console.error("Erro ao buscar modelos de contrato:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar modelos de contrato.");
    }
};

/**
 * Busca um modelo de contrato específico pelo ID.
 */
export const getModeloContratoById = async (id) => {
    try {
        const response = await axiosInstance.get(`<span class="math-inline">\{API\_URL\}/</span>{id}`);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao buscar modelo de contrato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar o modelo de contrato.");
    }
};

/**
 * Cria um novo modelo de contrato.
 */
export const createModeloContrato = async (modeloData) => {
    try {
        const response = await axiosInstance.post(API_URL, modeloData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar modelo de contrato:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar o modelo de contrato.");
    }
};

/**
 * Atualiza um modelo de contrato existente.
 */
export const updateModeloContrato = async (id, modeloData) => {
    try {
        const response = await axiosInstance.put(`<span class="math-inline">\{API\_URL\}/</span>{id}`, modeloData);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao atualizar modelo de contrato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar o modelo de contrato.");
    }
};

/**
 * Desativa (soft delete) um modelo de contrato.
 */
export const deleteModeloContrato = async (id) => {
    try {
        const response = await axiosInstance.delete(`<span class="math-inline">\{API\_URL\}/</span>{id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao desativar modelo de contrato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao desativar o modelo de contrato.");
    }
};