// src/api/dashboard.js
import axiosInstance from "./axiosInstance.js";

const API_URL = '/dashboard'; // Base URL para endpoints do dashboard

/**
 * Busca os dados resumidos para o dashboard.
 * @returns {Promise<object>} Objeto com { totalActiveLeads, leadsByStatus, ... }.
 */
export const getLeadSummaryApi = async (filter = 'month') => {
    try {
        const response = await axiosInstance.get(`${API_URL}/summary`, { params: { filter } });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar resumo de leads:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar resumo de leads.");
    }
};

export const getFinancialSummaryApi = async (filter = 'month') => {
    try {
        const response = await axiosInstance.get(`${API_URL}/financeiro`, { params: { filter } });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar resumo financeiro:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar o resumo financeiro.");
    }
};


export const getAdvancedMetricsApi = async (filter = 'month') => {
    try {
        const response = await axiosInstance.get(`${API_URL}/advanced-metrics`, { params: { filter } });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar métricas avançadas:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar métricas avançadas.");
    }
};