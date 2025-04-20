// src/api/discardReasons.js
import axiosInstance from "./axiosInstante.js";

export const getDiscardReasons = async () => {
  try {
    const response = await axiosInstance.get("/motivosdescarte");
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao buscar motivos de descarte:",
      error.response?.data || error.message
    );
    throw new Error("Falha ao buscar motivos de descarte.");
  }
};
