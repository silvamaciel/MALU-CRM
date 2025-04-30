// src/api/dashboard.js
import axiosInstance from "./axiosInstance.js";

const API_URL = '/dashboard'; // Base URL para endpoints do dashboard

/**
 * Busca os dados resumidos para o dashboard.
 * @returns {Promise<object>} Objeto com { totalActiveLeads, leadsByStatus, ... }.
 */
export const getDashboardSummary = async () => {
    try {
        // Chama GET /api/dashboard/summary (backend filtra pela empresa do token)
        const response = await axiosInstance.get(`${API_URL}/summary`);
        return response.data || { totalActiveLeads: 0, leadsByStatus: [] }; // Retorna default se data for vazia
    } catch (error) {
        console.error('Erro ao buscar resumo do dashboard:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao buscar dados do dashboard.');
    }
};