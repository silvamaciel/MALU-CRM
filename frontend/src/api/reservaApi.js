// src/api/reservaApi.js
import axiosInstance from "./axiosInstance";

const API_URL = '/reservas'; // Base URL para endpoints de reserva

/**
 * Cria uma nova reserva no backend.
 * @param {object} reservaPayload - Dados da reserva a serem enviados.
 * Estrutura esperada: { leadId, unidadeId, empreendimentoId, validadeReserva, valorSinal?, observacoesReserva? }
 * @returns {Promise<object>} A reserva criada.
 */
export const createReservaApi = async (reservaPayload) => {
    try {
        const response = await axiosInstance.post(API_URL, reservaPayload);
        return response.data.data; // O backend retorna { success: true, data: novaReserva }
    } catch (error) {
        console.error("Erro ao criar reserva:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar a reserva.");
    }
};

export const getReservasByCompanyApi = async (page = 1, limit = 10, filters = {}) => {
    try {
        const params = { page, limit, ...filters };
        Object.keys(params).forEach(key => (params[key] === '' || params[key] === null || params[key] === undefined) && delete params[key]);

        const response = await axiosInstance.get(API_URL, { params }); // API_URL é '/reservas'
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar reservas:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar reservas.");
    }
};