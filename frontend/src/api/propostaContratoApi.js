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

/**
 * Busca uma Proposta/Contrato específica pelo seu ID.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @returns {Promise<object>} A Proposta/Contrato encontrada.
 */
export const getPropostaContratoByIdApi = async (propostaContratoId) => {
    if (!propostaContratoId) throw new Error("ID da Proposta/Contrato é obrigatório.");
    try {
        // Endpoint para buscar Proposta/Contrato por ID no backend
        const response = await axiosInstance.get(`${API_URL_BASE}/${propostaContratoId}`);
        return response.data.data; // Assumindo que o backend retorna { success: true, data: propostaContrato }
    } catch (error) {
        console.error(`Erro ao buscar Proposta/Contrato ${propostaContratoId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar a Proposta/Contrato.");
    }
};

/**
 * Solicita o PDF de uma Proposta/Contrato ao backend.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @returns {Promise<Blob>} O PDF como um Blob.
 */
export const downloadPropostaContratoPdfApi = async (propostaContratoId) => {
    if (!propostaContratoId) throw new Error("ID da Proposta/Contrato é obrigatório para download.");
    try {
        const response = await axiosInstance.get(`${API_URL_BASE}/${propostaContratoId}/pdf`, {
            responseType: 'blob', // Importante para tratar a resposta como um arquivo binário
        });
        return response.data; // Retorna o Blob do PDF
    } catch (error) {
        console.error(`Erro ao baixar PDF da Proposta/Contrato ${propostaContratoId}:`, error.response?.data || error.message);
        // Tentar ler o erro se for um JSON (caso o backend não tenha enviado um PDF por algum erro)
        if (error.response && error.response.data instanceof Blob && error.response.data.type.includes('application/json')) {
            const errorJson = await error.response.data.text();
            const errorObj = JSON.parse(errorJson);
            throw errorObj || new Error("Falha ao baixar o PDF.");
        }
        throw new Error("Falha ao baixar o PDF da Proposta/Contrato.");
    }
};

/**
 * Atualiza uma Proposta/Contrato existente.
 * @param {string} propostaContratoId - ID da Proposta/Contrato a ser atualizada.
 * @param {object} propostaData - Dados para atualizar.
 * @returns {Promise<object>} A Proposta/Contrato atualizada.
 */
export const updatePropostaContratoApi = async (propostaContratoId, propostaData) => {
    if (!propostaContratoId) throw new Error("ID da Proposta/Contrato é obrigatório para atualização.");
    try {
        const response = await axiosInstance.put(`${API_URL_BASE}/${propostaContratoId}`, propostaData);
        return response.data.data; // Assumindo que o backend retorna { success: true, data: propostaContrato }
    } catch (error) {
        console.error(`Erro ao atualizar Proposta/Contrato ${propostaContratoId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar a Proposta/Contrato.");
    }
};



/**
 * Atualiza o status de uma Proposta/Contrato existente.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {string} novoStatus - O novo status para a proposta.
 * @param {object} dadosAdicionais - Dados extras como dataAssinaturaCliente, dataVendaEfetivada.
 * @returns {Promise<object>} A Proposta/Contrato atualizada.
 */
export const updatePropostaContratoStatusApi = async (propostaContratoId, novoStatus, dadosAdicionais = {}) => {
    if (!propostaContratoId || !novoStatus) {
        throw new Error("ID da Proposta/Contrato e novo status são obrigatórios.");
    }
    try {
        const response = await axiosInstance.put(`${API_URL_BASE}/${propostaContratoId}/status`, { 
            novoStatus,
            ...dadosAdicionais // Envia dataAssinaturaCliente, etc., se houver
        });
        return response.data.data; // Assumindo que o backend retorna { success: true, data: propostaAtualizada }
    } catch (error) {
        console.error(`Erro ao atualizar status da Proposta/Contrato ${propostaContratoId} para ${novoStatus}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar o status da Proposta/Contrato.");
    }
};


/**
 * Registra o distrato de uma Proposta/Contrato.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {object} dadosDistrato - { motivoDistrato, dataDistrato?, leadMotivoDescarteId? }
 * @returns {Promise<object>} A Proposta/Contrato atualizada.
 */
export const registrarDistratoApi = async (propostaContratoId, dadosDistrato) => {
    if (!propostaContratoId) throw new Error("ID da Proposta/Contrato é obrigatório para distrato.");
    if (!dadosDistrato || !dadosDistrato.motivoDistrato) throw new Error("Dados do distrato (motivo) são obrigatórios.");
    try {
        const response = await axiosInstance.put(`<span class="math-inline">\{API\_URL\_BASE\}/</span>{propostaContratoId}/distrato`, dadosDistrato);
        return response.data.data; // Assumindo que o backend retorna { success: true, data: propostaAtualizada }
    } catch (error) {
        console.error(`Erro ao registrar distrato para Proposta/Contrato ${propostaContratoId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao registrar o distrato.");
    }
};