// src/api/usuarios.js
import axiosInstance from "./axiosInstance.js";

export const getUsuarios = async () => {
  try {
    const response = await axiosInstance.get('/users');
    return response.data; // Deve retornar um array de objetos { _id: '...', nome: '...' }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao buscar usuários.');
  }
};