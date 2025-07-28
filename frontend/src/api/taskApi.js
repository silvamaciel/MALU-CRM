// src/api/taskApi.js
import axiosInstance from "./axiosInstance";

const API_URL = '/tasks';

/**
 * Busca tarefas com base em filtros (ex: por leadId).
 * @param {object} params - Objeto de filtros, ex: { lead: 'LEAD_ID' }.
 */
export const getTasksApi = async (params = {}) => {
    try {
        const response = await axiosInstance.get(API_URL, { params });
        return response.data.data; // Retorna o array de tarefas
    } catch (error) {
        console.error("Erro ao buscar tarefas:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar tarefas.");
    }
};

/**
 * Cria uma nova tarefa.
 * @param {object} taskData - Dados da tarefa a ser criada.
 */
export const createTaskApi = async (taskData) => {
    try {
        const response = await axiosInstance.post(API_URL, taskData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar tarefa:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar tarefa.");
    }
};

/**
 * Atualiza uma tarefa existente.
 * @param {string} taskId - O ID da tarefa a ser atualizada.
 * @param {object} updateData - Os campos a serem atualizados.
 */
export const updateTaskApi = async (taskId, updateData) => {
    try {
        const response = await axiosInstance.put(`${API_URL}/${taskId}`, updateData);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao atualizar tarefa ${taskId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar tarefa.");
    }
};

/**
 * Exclui uma tarefa.
 * @param {string} taskId - O ID da tarefa a ser excluída.
 */
export const deleteTaskApi = async (taskId) => {
    try {
        const response = await axiosInstance.delete(`${API_URL}/${taskId}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao excluir tarefa ${taskId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir tarefa.");
    }
};