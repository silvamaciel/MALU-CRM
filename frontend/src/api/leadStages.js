// src/api/leadStage.js
import axiosInstance from "./axiosInstance.js";

export const getSituacoes = async () => {
  try {
    const response = await axiosInstance.get('/leadStage');
    return response.data; // Deve retornar um array de objetos { _id: '...', nome: '...' }
  } catch (error) {
    console.error('Erro ao buscar situações:', error.response?.data || error.message);
    throw error.response?.data || new Error('Falha ao buscar situações.');
  }
};