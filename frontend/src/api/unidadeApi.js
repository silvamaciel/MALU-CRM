// src/api/unidadeApi.js
import axiosInstance from "./axiosInstance";

const buildApiUrl = (empreendimentoId, unidadeId = null) => {
    let url = `/empreendimentos/${empreendimentoId}/unidades`;
    if (unidadeId) {
        url += `/${unidadeId}`;
    }
    return url;
};

/**
 * Busca unidades de um empreendimento com paginação e filtros.
 */
export const getUnidades = async (empreendimentoId, page = 1, limit = 10, filters = {}) => {
    if (!empreendimentoId) throw new Error("ID do Empreendimento é obrigatório.");
    try {
        const params = { page, limit, ...filters };
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null || params[key] === undefined) && delete params[key]);
        
        const response = await axiosInstance.get(buildApiUrl(empreendimentoId), { params });
        return response.data; // Espera { success: true, unidades: [], total: X, page: Y, pages: Z }
    } catch (error) {
        console.error("Erro ao buscar unidades:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar unidades.");
    }
};

/**
 * Busca uma unidade específica pelo ID.
 */
export const getUnidadeByIdApi = async (empreendimentoId, unidadeId) => {
    if (!empreendimentoId || !unidadeId) throw new Error("IDs do Empreendimento e da Unidade são obrigatórios.");
    try {
        const response = await axiosInstance.get(buildApiUrl(empreendimentoId, unidadeId));
        return response.data.data; // Espera { success: true, data: unidade }
    } catch (error) {
        console.error(`Erro ao buscar unidade ${unidadeId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar a unidade.");
    }
};

/**
 * Cria uma nova unidade.
 */
export const createUnidadeApi = async (empreendimentoId, unidadeData) => {
    if (!empreendimentoId) throw new Error("ID do Empreendimento é obrigatório.");
    try {
        const response = await axiosInstance.post(buildApiUrl(empreendimentoId), unidadeData);
        return response.data.data; // Espera { success: true, data: novaUnidade }
    } catch (error) {
        console.error("Erro ao criar unidade:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar a unidade.");
    }
};

/**
 * Atualiza uma unidade existente.
 */
export const updateUnidadeApi = async (empreendimentoId, unidadeId, unidadeData) => {
    if (!empreendimentoId || !unidadeId) throw new Error("IDs do Empreendimento e da Unidade são obrigatórios.");
    try {
        const response = await axiosInstance.put(buildApiUrl(empreendimentoId, unidadeId), unidadeData);
        return response.data.data; // Espera { success: true, data: unidadeAtualizada }
    } catch (error) {
        console.error(`Erro ao atualizar unidade ${unidadeId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar a unidade.");
    }
};

/**
 * Desativa (soft delete) uma unidade.
 */
export const deleteUnidadeApi = async (empreendimentoId, unidadeId) => {
    if (!empreendimentoId || !unidadeId) throw new Error("IDs do Empreendimento e da Unidade são obrigatórios.");
    try {
        const response = await axiosInstance.delete(buildApiUrl(empreendimentoId, unidadeId));
        return response.data; // Espera { success: true, data: { message: "..." } }
    } catch (error) {
        console.error(`Erro ao desativar unidade ${unidadeId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao desativar a unidade.");
    }
};