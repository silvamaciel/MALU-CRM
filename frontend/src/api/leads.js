// src/api/leads.js
import axiosInstance from "./axiosInstance.js";

/**
 * Busca todos os leads.
 * @param {object} params - Parâmetros de query (para filtros futuros, ex: { nome: 'Maria' })
 * @returns {Promise<Array>} - Uma promessa que resolve com a lista de leads.
 */
export const getLeads = async (params = {}) => {
  try {
    // A API espera GET /leads
    const response = await axiosInstance.get("/leads", { params });
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao buscar leads:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Cria um novo lead.
 * @param {object} leadData - Os dados do lead a serem enviados no corpo da requisição.
 * AGORA ESPERA IDs: { nome: "...", ..., situacao: "id_da_situacao", origem: "id_da_origem", responsavel: "id_do_usuario" }
 * @returns {Promise<object>} - Uma promessa que resolve com os dados do lead criado.
 */
export const createLead = async (leadData) => {
  try {
    // Payload agora deve conter os IDs corretos para situacao, origem, responsavel
    const response = await axiosInstance.post("/leads", leadData);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar lead:", error.response?.data || error.message);
    // Extrair e relançar a mensagem de erro da API, se disponível
    const apiErrorMessage =
      error.response?.data?.message || error.response?.data?.error;
    throw new Error(apiErrorMessage || "Falha ao criar lead.");
  }
};

/**
 * Busca um lead específico pelo seu ID.
 * @param {string} id - O ID do lead a ser buscado.
 * @returns {Promise<object>} - Uma promessa que resolve com os dados do lead.
 */
export const getLeadById = async (id) => {
  // Opcional: Validar formato do ID antes de chamar a API
  // Removido para manter validação no backend
  // if (!mongoose.Types.ObjectId.isValid(id)) {
  //    console.error('Formato de ID inválido fornecido para getLeadById:', id);
  //    throw new Error('Formato de ID inválido.'); // Lança erro cedo
  // }
  try {
    // A API espera GET /leads/:id
    const response = await axiosInstance.get(`/leads/${id}`);
    return response.data; // Retorna o objeto do lead encontrado
  } catch (error) {
    console.error(`Erro ao buscar lead com ID ${id}:`, error.response?.data || error.message);
    // Se o erro for 404, a mensagem pode vir do backend
    if (error.response?.status === 404) {
        throw new Error('Lead não encontrado.');
    }
    // Relança outros erros
    throw error.response?.data || new Error('Falha ao buscar detalhes do lead.');
  }
};

/**
 * Atualiza um lead existente.
 * @param {string} id - O ID do lead a ser atualizado.
 * @param {object} leadData - Os dados do lead a serem atualizados. Pode ser parcial.
 * @returns {Promise<object>} - Uma promessa que resolve com os dados do lead atualizado.
 */
export const updateLead = async (id, leadData) => {
  try {
    // A API espera PUT /leads/:id com os dados no corpo
    const response = await axiosInstance.put(`/leads/${id}`, leadData);
    return response.data; // Retorna o lead atualizado pela API
  } catch (error) {
    console.error(`Erro ao atualizar lead com ID ${id}:`, error.response?.data || error.message);
    // Pega a mensagem de erro específica da API, se disponível
    const apiErrorMessage = error.response?.data?.error || error.response?.data?.message;
    throw new Error(apiErrorMessage || 'Falha ao atualizar lead.');
  }
};

/**
 * Descarta um lead enviando motivo e comentário.
 * @param {string} id - O ID do lead a ser descartado.
 * @param {object} discardData - Objeto com { motivoDescarte, comentario }.
 * @returns {Promise<object>} - Uma promessa que resolve com os dados do lead atualizado (descartado).
 */
export const discardLead = async (id, discardData) => {
  // Verifica se discardData contém motivoDescarte, que é obrigatório pela API
  if (!discardData || !discardData.motivoDescarte) {
       console.error("Motivo do descarte é obrigatório.", discardData);
       throw new Error("O motivo do descarte é obrigatório.");
  }
  try {
    // Assumindo que a rota no backend é /descartar/:id
    const response = await axiosInstance.put(`/leads/descartar/${id}`, discardData);
    return response.data; // Retorna o lead atualizado
  } catch (error) {
    console.error(`Erro ao descartar lead com ID ${id}:`, error.response?.data || error.message);
    const apiErrorMessage = error.response?.data?.error || error.response?.data?.message;
    throw new Error(apiErrorMessage || 'Falha ao descartar lead.');
  }
};


/**
 * Exclui permanentemente um lead.
 * @param {string} id - O ID do lead a ser excluído.
 * @returns {Promise<object>} - Uma promessa que resolve com a resposta da API (geralmente vazia ou uma mensagem de sucesso).
 */
export const deleteLead = async (id) => {
  try {
    // A API espera DELETE /leads/:id
    const response = await axiosInstance.delete(`/leads/${id}`);
    // DELETE bem-sucedido geralmente retorna 200 OK ou 204 No Content
    // Retornamos a resposta para caso o backend envie alguma mensagem útil
    return response.data || { message: "Lead excluído com sucesso." };
  } catch (error) {
    console.error(`Erro ao excluir lead com ID ${id}:`, error.response?.data || error.message);
    const apiErrorMessage = error.response?.data?.error || error.response?.data?.message;
    // Tratar 404 especificamente se necessário
    if (error.response?.status === 404) {
         throw new Error('Lead não encontrado para exclusão.');
    }
    throw new Error(apiErrorMessage || 'Falha ao excluir lead.');
  }
};

/**
 * Busca o histórico de alterações de um lead específico.
 * @param {string} leadId - O ID do lead cujo histórico deve ser buscado.
 * @returns {Promise<Array>} - Uma promessa que resolve com um array de registros de histórico.
 */
export const getLeadHistory = async (leadId) => {
  if (!leadId) {
     // Evita chamada desnecessária se ID não estiver disponível
     console.warn("Tentativa de buscar histórico sem ID de lead.");
     return []; // Retorna array vazio ou pode lançar erro
  }
  try {
    // Chama o endpoint GET /api/leads/:id/history
    const response = await axiosInstance.get(`/leads/${leadId}/history`);
    // Espera-se que a resposta seja um array de objetos de histórico
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Erro ao buscar histórico para lead ${leadId}:`, error.response?.data || error.message);
    // Pode retornar array vazio ou lançar erro dependendo de como quer tratar na UI
    // throw new Error("Falha ao buscar histórico do lead.");
    return []; // Retorna vazio para não quebrar a UI que espera um array
  }
};


/**
 * Faz o upload de um arquivo CSV para importação de leads.
 * @param {File} file - O arquivo CSV selecionado pelo usuário.
 * @returns {Promise<object>} O resumo da importação retornado pelo backend.
 */
export const importLeadsFromCSVApi = async (file) => {
    if (!file) throw new Error("Nenhum arquivo selecionado.");

    const formData = new FormData();
    // 'csvfile' deve corresponder ao nome esperado pelo multer no backend
    formData.append('csvfile', file); 

    try {
        const response = await axiosInstance.post('/leads/importar-csv', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Essencial para upload de arquivos
            },
        });
        return response.data.data; // Retorna o objeto de resumo
    } catch (error) {
        console.error("Erro ao importar CSV:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao importar o arquivo CSV.");
    }
};


/**
 * Faz o download do arquivo CSV modelo do backend.
 * @returns {Promise<Blob>} O arquivo CSV como um Blob.
 */
export const downloadCSVTemplateApi = async () => {
    try {
        const response = await axiosInstance.get('/leads/csv-template', {
            responseType: 'blob', // Essencial para tratar a resposta como um arquivo
        });
        return response.data;
    } catch (error) {
        console.error("Erro ao baixar modelo CSV:", error);
        throw new Error("Falha ao baixar o arquivo modelo.");
    }
};