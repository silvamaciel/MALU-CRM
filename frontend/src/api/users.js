// src/api/users.js (ou usuarios.js)
import axiosInstance from "./axiosInstance.js"; // Sua instância Axios

const API_URL = '/users'; 

/**
 * Busca os usuários da empresa do usuário logado.
 * O backend aplica o filtro de empresa baseado no token JWT.
 * @returns {Promise<Array>} Array com os usuários.
 */
export const getUsuarios = async () => { // Mantendo nome antigo por consistência com form
    try {
        const response = await axiosInstance.get(API_URL);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Erro ao buscar usuários:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao buscar usuários.');
    }
};

/**
 * Cria um novo usuário (apenas admin pode chamar no backend).
 * @param {object} userData - Dados do novo usuário { nome, email, perfil, senha? }.
 * @returns {Promise<object>} O usuário criado.
 */
export const createUser = async (userData) => {
    try {
        // POST /api/users/
        const response = await axiosInstance.post(API_URL, userData);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar usuário:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar usuário.");
    }
};

/**
 * Atualiza um usuário existente.
 * @param {string} id - ID do usuário a ser atualizado.
 * @param {object} updateData - Dados a serem atualizados { nome?, email?, perfil?, ativo?, senha? }.
 * @returns {Promise<object>} O usuário atualizado.
 */
export const updateUser = async (id, updateData) => {
    if (!id) throw new Error("ID é necessário para atualizar o usuário.");
    try {
        // PUT /api/users/:id
        const response = await axiosInstance.put(`${API_URL}/${id}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar usuário ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao atualizar usuário.");
    }
};

/**
 * Exclui um usuário.
 * @param {string} id - ID do usuário a ser excluído.
 * @returns {Promise<object>} Resposta da API (mensagem de sucesso).
 */
export const deleteUser = async (id) => {
    if (!id) throw new Error("ID é necessário para excluir o usuário.");
    try {
         // DELETE /api/users/:id
        const response = await axiosInstance.delete(`${API_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Erro ao excluir usuário ${id}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir usuário.");
    }
};

