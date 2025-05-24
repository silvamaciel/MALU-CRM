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

