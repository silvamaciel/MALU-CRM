import axiosInstance from "./axiosInstance";

const API_URL = '/api/agenda';

/**
 * Busca eventos da agenda (aplicando filtro de companyId via token).
 * @returns {Promise<Array>} Array de eventos.
 */
export const getEventosAgenda = async () => {
  try {
    const response = await axiosInstance.get(API_URL);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Erro ao buscar eventos da agenda:", error.response?.data || error.message);
    throw error.response?.data || new Error("Falha ao buscar eventos.");
  }
};

/**
 * Cria um novo evento na agenda.
 * @param {object} eventoData - { titulo, descricao, dataInicio, dataFim }
 * @returns {Promise<object>} Evento criado.
 */
export const criarEventoAgenda = async (eventoData) => {
  try {
    const response = await axiosInstance.post(API_URL, eventoData);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar evento na agenda:", error.response?.data || error.message);
    throw error.response?.data || new Error("Falha ao criar evento.");
  }
};

/**
 * Exclui um evento da agenda.
 * @param {string} eventoId - ID do evento.
 * @returns {Promise<object>} Resposta da API.
 */
export const deletarEventoAgenda = async (eventoId) => {
    console.log(eventoId);
  if (!eventoId) throw new Error("ID do evento obrigatório.");
  try {
    const response = await axiosInstance.delete(`${API_URL}/${eventoId}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao excluir evento:", error.response?.data || error.message);
    throw error.response?.data || new Error("Falha ao excluir evento.");
  }
};
