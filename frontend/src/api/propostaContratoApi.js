// src/api/propostaContratoApi.js
import axiosInstance from "./axiosInstance";

const API_URL_BASE = '/propostas-contratos';
const RESERVA_API_URL = '/reservas';

/**
 * Busca os detalhes de uma reserva específica, incluindo dados populados.
 * @param {string} reservaId - ID da Reserva.
 * @returns {Promise<object>} Os dados da reserva.
 */
export const getReservaByIdApi = async (reservaId) => {
    if (!reservaId) throw new Error("ID da Reserva é obrigatório.");
    try {
        // Este endpoint deve existir no seu backend (em reservaRoutes.js)
        // GET /api/reservas/:id
        const response = await axiosInstance.get(`${RESERVA_API_URL}/${reservaId}`);
        return response.data.data; // Assumindo que o backend retorna { success: true, data: reserva }
    } catch (error) {
        console.error(`Erro ao buscar reserva ${reservaId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar detalhes da reserva.");
    }
};

/**
 * Cria uma nova Proposta/Contrato a partir de uma Reserva.
 * @param {string} reservaId - ID da Reserva base.
 * @param {object} propostaData - Dados da nova proposta/contrato.
 * @returns {Promise<object>} A Proposta/Contrato criada.
 */
export const createPropostaContratoApi = async (reservaId, propostaData) => {
    if (!reservaId) throw new Error("ID da Reserva é obrigatório para criar a proposta.");
    try {
        // Chama o endpoint POST /api/propostas-contratos/a-partir-da-reserva/:reservaId
        const response = await axiosInstance.post(`${API_URL_BASE}/a-partir-da-reserva/${reservaId}`, propostaData);
        return response.data.data; // Assumindo { success: true, data: novaPropostaContrato }
    } catch (error) {
        console.error("Erro ao criar Proposta/Contrato:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar a Proposta/Contrato.");
    }
};

