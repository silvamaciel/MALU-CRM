import axiosInstance from "./axiosInstance";

// --- API de Contas a Receber (Parcelas) e Dashboard ---

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
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar parcelas:", error.response?.data);
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

// --- API de Indexadores (ADM Financeiro) ---

export const getIndexadoresApi = async () => {
    try {
        const response = await axiosInstance.get('/financeiro/indexadores');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar indexadores:", error.response?.data);
        throw error.response?.data || new Error("Falha ao buscar indexadores.");
    }
};



/**
 * Cria um novo tipo de indexador (ex: INCC, IGPM).
 */
export const createIndexadorApi = async (data) => {
    try {
        const response = await axiosInstance.post('/financeiro/indexadores', data);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar indexador:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar indexador.");
    }
};

/**
 * Adiciona ou atualiza um valor mensal para um indexador existente.
 */
export const upsertValorIndexadorApi = async (indexadorId, valorData) => {
    try {
        const response = await axiosInstance.post(`/financeiro/indexadores/${indexadorId}/valores`, valorData);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao salvar valor do indexador:", error.response?.data);
        throw error.response?.data || new Error("Falha ao salvar valor do indexador.");
    }
};

// --- Funções para Contas a Pagar (Despesas) e Credores ---

/**
 * Busca a lista de credores da empresa.
 */
export const listarCredoresApi = async () => {
    try {
        const response = await axiosInstance.get('/financeiro/credores');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar credores:", error.response?.data);
        throw error.response?.data || new Error("Falha ao listar credores.");
    }
};

/**
 * Cria um novo credor.
 */
export const criarCredorApi = async (dadosCredor) => {
    try {
        const response = await axiosInstance.post('/financeiro/credores', dadosCredor);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar credor:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar credor.");
    }
};

/**
 * Busca a lista de despesas (contas a pagar) com filtros.
 */
export const listarDespesasApi = async (params = {}) => {
    try {
        const response = await axiosInstance.get('/financeiro/despesas', { params });
        return response.data;
    } catch (error) {
        console.error("Erro ao listar despesas:", error.response?.data);
        throw error.response?.data || new Error("Falha ao listar despesas.");
    }
};

/**
 * Cria uma nova despesa.
 */
export const criarDespesaApi = async (dadosDespesa) => {
    try {
        const response = await axiosInstance.post('/financeiro/despesas', dadosDespesa);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar despesa:", error.response?.data);
        throw error.response?.data || new Error("Falha ao criar despesa.");
    }
};

/**
 * Regista o pagamento de uma despesa.
 */
export const registrarPagamentoDespesaApi = async (despesaId, dadosPagamento) => {
    try {
        const response = await axiosInstance.post(`/financeiro/despesas/${despesaId}/pagar`, dadosPagamento);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao registar pagamento de despesa:", error.response?.data);
        throw error.response?.data || new Error("Falha ao registar pagamento.");
    }
};