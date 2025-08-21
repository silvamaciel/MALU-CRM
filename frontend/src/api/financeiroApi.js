import axiosInstance from "./axiosInstance";

export const getFinanceiroDashboardApi = async () => {
    try {
        const response = await axiosInstance.get('/financeiro/dashboard');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard financeiro:", error.response?.data);
        throw error.response?.data || new Error("Falha ao buscar dados do dashboard.");
    }
};

export const getParcelasApi = async (params = {}) => {
    try {
        const response = await axiosInstance.get('/financeiro/parcelas', { params });
        const raw = response?.data ?? {};

        // muitos backends devolvem { success, data: { data, total } } ou { data, total } direto
        const envelope = raw?.data && (Array.isArray(raw.data) || typeof raw.data === 'object')
            ? raw.data
            : raw;

        const rows =
            envelope?.data ??
            envelope?.rows ??
            envelope?.items ??
            envelope?.results ??
            envelope?.parcelas ??
            [];

        const total =
            envelope?.total ??
            envelope?.count ??
            envelope?.pagination?.total ??
            rows.length;

        return { data: rows, total };
    } catch (error) {
        console.error("Erro ao buscar parcelas:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar parcelas.");
    }
};

export const registrarBaixaApi = async (parcelaId, dadosBaixa) => {
    try {
        const response = await axiosInstance.post(`/financeiro/parcelas/${parcelaId}/baixa`, dadosBaixa);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao registar baixa:", error.response?.data);
        throw error.response?.data || new Error("Falha ao registar baixa.");
    }
};

export const getIndexadoresApi = async () => {
    try {
        const response = await axiosInstance.get('/financeiro/indexadores');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar indexadores:", error.response?.data);
        throw error.response?.data || new Error("Falha ao buscar indexadores.");
    }
};

export const createIndexadorApi = async (data) => {
    try {
        const response = await axiosInstance.post('/financeiro/indexadores', data);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar indexador:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar indexador.");
    }
};

export const upsertValorIndexadorApi = async (indexadorId, valorData) => {
    try {
        const response = await axiosInstance.post(`/financeiro/indexadores/${indexadorId}/valores`, valorData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao salvar valor do indexador:", error.response?.data);
        throw error.response?.data || new Error("Falha ao salvar valor do indexador.");
    }
};

export const listarCredoresApi = async () => {
    try {
        const response = await axiosInstance.get('/financeiro/credores');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar credores:", error.response?.data);
        throw error.response?.data || new Error("Falha ao listar credores.");
    }
};

export const criarCredorApi = async (dadosCredor) => {
    try {
        const response = await axiosInstance.post('/financeiro/credores', dadosCredor);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar credor:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar credor.");
    }
};

export const listarDespesasApi = async (params = {}) => {
    try {
        const response = await axiosInstance.get('/financeiro/despesas', { params });
        return response.data;
    } catch (error) {
        console.error("Erro ao listar despesas:", error.response?.data);
        throw error.response?.data || new Error("Falha ao listar despesas.");
    }
};

export const criarDespesaApi = async (dadosDespesa) => {
    try {
        const response = await axiosInstance.post('/financeiro/despesas', dadosDespesa);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar despesa:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar despesa.");
    }
};

export const registrarPagamentoDespesaApi = async (despesaId, dadosPagamento) => {
    try {
        const response = await axiosInstance.post(`/financeiro/despesas/${despesaId}/pagar`, dadosPagamento);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao registar pagamento de despesa:", error.response?.data);
        throw error.response?.data || new Error("Falha ao registar pagamento.");
    }
};