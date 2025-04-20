// src/api/origens.js
import axiosInstance from "./axiosInstante.js";

export const getOrigens = async () => {
  try {
    const response = await axiosInstance.get('/origens');
    return response.data; // Deve retornar um array de objetos { _id: '...', nome: '...' }
  } catch (error) {
    console.error('Erro ao buscar origens:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao buscar origens.');
  }
};