// src/api/brokerContacts.js
import axiosInstance from "./axiosInstance.js";

const API_URL = '/brokers';

/**
 * Busca contatos de corretores da empresa logada.
 */
export const getBrokerContacts = async () => {
    try {
        const response = await axiosInstance.get(API_URL);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Erro ao buscar contatos de corretores:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao buscar contatos de corretores.');
    }
};

/**
 * Cria um novo contato de corretor.
 * @param {object} brokerData - Dados do corretor.
 */
export const createBrokerContact = async (brokerData) => {
    try {
        const response = await axiosInstance.post(API_URL, brokerData);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar contato:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar contato.");
    }
};

/**
 * Busca um contato de corretor por ID.
 * @param {string} id - ID do contato.
 */
export const getBrokerContactById = async (id) => {
    if (!id) throw new Error("ID é necessário para buscar o contato.");
    try {
        const response = await axiosInstance.get(`${API_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar contato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar contato.");
    }
};


/**
 * Atualiza um contato de corretor existente.
 * @param {string} id - ID do contato.
 * @param {object} updateData - Dados a serem atualizados.
 */
export const updateBrokerContact = async (id, updateData) => {
    if (!id) throw new Error("ID é necessário para atualizar o contato.");
    try {
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar contato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar contato.");
    }
};

/**
 * Exclui um contato de corretor.
 * @param {string} id - ID do contato.
 */
export const deleteBrokerContact = async (id) => {
    if (!id) throw new Error("ID é necessário para excluir o contato.");
    try {
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao excluir contato ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir contato.");
    }
};