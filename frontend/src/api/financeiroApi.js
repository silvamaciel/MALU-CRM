import axiosInstance from "./axiosInstance";

// --- API de Parcelas e Dashboard ---
export const getFinanceiroDashboardApi = async () => {
    const response = await axiosInstance.get('/financeiro/dashboard');
    return response.data.data;
};

export const getParcelasApi = async (params = {}) => {
    const response = await axiosInstance.get('/financeiro/parcelas', { params });
    return response.data; // Retorna o objeto completo com { parcelas, total, ... }
};

export const registrarBaixaApi = async (parcelaId, dadosBaixa) => {
    const response = await axiosInstance.post(`/financeiro/parcelas/${parcelaId}/baixa`, dadosBaixa);
    return response.data.data;
};

// --- API de Indexadores ---
export const getIndexadoresApi = async () => {
    const response = await axiosInstance.get('/indexadores');
    return response.data.data;
};

export const createIndexadorApi = async (data) => {
    const response = await axiosInstance.post('/indexadores', data);
    return response.data.data;
};

export const upsertValorIndexadorApi = async (indexadorId, valorData) => {
    const response = await axiosInstance.post(`/indexadores/${indexadorId}/valores`, valorData);
    return response.data.data;
};