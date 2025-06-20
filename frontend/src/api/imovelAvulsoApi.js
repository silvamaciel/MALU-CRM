// src/api/imovelAvulsoApi.js
import axiosInstance from "./axiosInstance";

const API_URL = '/imoveis-avulsos';

/**
 * Busca imóveis avulsos com filtros e paginação.
 */
export const getImoveisApi = async (params = {}) => {
    try {
        const response = await axiosInstance.get(API_URL, { params });
        return response.data; // Espera { success: true, imoveis: [], total: X, ... }
    } catch (error) {
        console.error("Erro ao buscar imóveis avulsos:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar imóveis.");
    }
};

/**
 * Busca um imóvel avulso específico pelo ID.
 */
export const getImovelByIdApi = async (id) => {
    try {
        const response = await axiosInstance.get(`${API_URL}/${id}`);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao buscar imóvel ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar o imóvel.");
    }
};

/**
 * Cria um novo imóvel avulso.
 */
export const createImovelApi = async (imovelData) => {
    try {
        const response = await axiosInstance.post(API_URL, imovelData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar imóvel:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar o imóvel.");
    }
};

/**
 * Atualiza um imóvel avulso existente.
 */
export const updateImovelApi = async (id, updateData) => {
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao atualizar imóvel ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar o imóvel.");
    }
};

/**
 * Exclui um imóvel avulso.
 */
export const deleteImovelApi = async (id) => {
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao excluir imóvel ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir o imóvel.");
    }
};