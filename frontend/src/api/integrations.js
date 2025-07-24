// src/api/integrations.js
import axiosInstance from "./axiosInstance.js";

const API_URL = '/integrations'; // Base URL para endpoints de integração

/**
 * Envia os dados da página do Facebook selecionada e o token de acesso do usuário
 * para o backend finalizar a conexão e configurar o webhook.
 * @param {string} pageId - O ID da Página do Facebook selecionada.
 * @param {string} userAccessToken - O token de acesso do usuário obtido do Facebook Login.
 * @returns {Promise<object>} Resposta do backend (ex: mensagem de sucesso).
 */
export const connectFacebookPage = async (pageId, userAccessToken) => {
    if (!pageId || !userAccessToken) {
        throw new Error("ID da Página e Token de Acesso são necessários.");
    }
    try {
        const response = await axiosInstance.post(`${API_URL}/facebook/connect-page`, {
            pageId: pageId,
            accessToken: userAccessToken // Envia o token do USUÁRIO
        });
        return response.data;
    } catch (error) {
        console.error('Erro ao conectar página do Facebook no backend:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao finalizar conexão com Facebook.');
    }
};


/**
 * Busca o status atual da integração com o Facebook para a empresa do usuário.
 * @returns {Promise<object>} Objeto com { isConnected: boolean, pageId?: string, pageName?: string }
 */
export const getFacebookConnectionStatus = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}/facebook/status`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar status da conexão Facebook:', error.response?.data || error.message);
        return { isConnected: false, error: error.response?.data?.error || "Falha ao buscar status." };
    }
};



/**
 * Solicita ao backend para desconectar a página do Facebook atualmente integrada.
 * @returns {Promise<object>} Resposta do backend (mensagem de sucesso).
 */
export const disconnectFacebookPage = async () => {
    try {
        const response = await axiosInstance.post(`${API_URL}/facebook/disconnect`);
        return response.data;
    } catch (error) {
        console.error('Erro ao desconectar página do Facebook:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao desconectar página do Facebook.');
    }
};


/**
 * Solicita ao backend para iniciar a sincronização de contatos do Google
 * e importá-los como leads.
 * @returns {Promise<object>} Resposta do backend (mensagem de sucesso e resumo da importação).
 */
export const syncGoogleContactsApi = async () => {
    try {
        // Chama o novo endpoint POST que criamos no backend
        const response = await axiosInstance.post(`${API_URL}/google/sync-contacts`);
        return response.data; // Espera { message, summary: { leadsImported, ... } }
    } catch (error) {
        console.error('Erro ao sincronizar contatos do Google:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao sincronizar contatos do Google.');
    }
};


/**
 * Busca a lista de contatos do Google do usuário autenticado através do backend.
 * @returns {Promise<Array>} Um array de objetos de contato simplificados.
 */
export const listGoogleContactsApi = async () => {
    try {
        // Chama o endpoint GET /api/integrations/google/list-contacts
        const response = await axiosInstance.get(`${API_URL}/google/list-contacts`);
        // O backend retorna um array de contatos ou um erro.
        return Array.isArray(response.data) ? response.data : []; // Garante que retorna um array
    } catch (error) {
        console.error('Erro ao listar contatos do Google via API:', error.response?.data || error.message);
        // Repassa o erro do backend ou lança um novo
        throw error.response?.data || new Error('Falha ao buscar lista de contatos do Google.');
    }
};


/**
 * Envia uma lista de contatos do Google selecionados para o backend processar e criar Leads.
 * @param {Array<object>} selectedContactsData - Array de objetos de contato para importar.
 * @returns {Promise<object>} Resposta do backend com o resumo da importação.
 */
export const processSelectedGoogleContactsApi = async (selectedContactsData) => {
    if (!Array.isArray(selectedContactsData) || selectedContactsData.length === 0) {
        // Lança um erro ou retorna um objeto indicando que nada foi enviado
        // throw new Error("Nenhum contato selecionado fornecido para importação.");
        console.warn("processSelectedGoogleContactsApi: Nenhum contato selecionado para enviar.");
        return { message: "Nenhum contato selecionado.", summary: { leadsImported: 0, duplicatesSkipped: 0, errorsEncountered: 0, totalProcessed: 0 }};
    }
    try {
        // Chama o endpoint POST /api/integrations/google/import-selected-contacts
        // O backend espera um objeto com uma chave 'selectedContacts' contendo o array
        const response = await axiosInstance.post(`${API_URL}/google/import-selected-contacts`, {
            selectedContacts: selectedContactsData // Envia os dados no corpo da requisição
        });
        return response.data; // Espera { message, summary: { ... } }
    } catch (error) {
        console.error('Erro ao enviar contatos selecionados para importação:', error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao processar importação de contatos selecionados.');
    }
};


/**
 * Busca a lista de formulários de Lead Ad de uma Página do Facebook específica.
 * @param {string} pageId - O ID da Página do Facebook.
 * @returns {Promise<Array>} Um array de objetos de formulário (ex: {id, name, status}).
 */
export const listFacebookPageFormsApi = async (pageId) => {
    if (!pageId) {
        throw new Error("ID da Página é necessário para listar formulários.");
    }
    try {
        const response = await axiosInstance.get(`${API_URL}/facebook/pages/${pageId}/forms`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error(`Erro ao listar formulários para Page ID ${pageId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao buscar formulários da página.');
    }
  };


  /**
 * Envia a lista de formulários do Facebook selecionados para serem vinculados a uma página/empresa.
 * @param {string} pageId - O ID da Página do Facebook.
 * @param {Array<{formId: string, formName: string}>} linkedFormsArray - Array de objetos de formulário.
 * @returns {Promise<object>} Resposta do backend.
 */
export const saveLinkedFacebookFormsApi = async (pageId, linkedFormsArray) => {
    if (!pageId) {
        throw new Error("ID da Página é obrigatório para salvar formulários vinculados.");
    }
    if (!Array.isArray(linkedFormsArray)) {
        console.warn("saveLinkedFacebookFormsApi: linkedFormsArray não é um array. Enviando array vazio.");
        // Trata o caso de nenhum formulário selecionado ou dado inválido como um array vazio
        // O backend pode ter uma lógica para limpar os formulários se receber um array vazio.
        linkedFormsArray = []; 
    }
    try {
        // Chama o endpoint POST /api/integrations/facebook/pages/:pageId/linked-forms
        const response = await axiosInstance.post(`${API_URL}/facebook/pages/${pageId}/linked-forms`, {
            linkedForms: linkedFormsArray // Envia os dados no corpo da requisição
        });
        return response.data; // Espera { message, linkedFormsCount }
    } catch (error) {
        console.error(`Erro ao salvar formulários vinculados para Page ID ${pageId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error('Falha ao salvar seleção de formulários.');
    }
};


/**
 * Solicita a criação de uma nova instância da Evolution API.
 * @param {string} instanceName - O nome da instância a ser criada.
 */
export const createEvolutionInstanceApi = async (instanceName) => {
    try {
        const response = await axiosInstance.post('/integrations/evolution/create-instance', { instanceName });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao criar instância da Evolution API:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao criar a instância.");
    }
};

/**
 * 
 * @param {string} instanceId 
 * @returns 
 */

export const getEvolutionInstanceStatusApi = async (instanceId) => {
    try {
        const response = await axiosInstance.get(`/integrations/evolution/instance/${instanceId}/status`);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao buscar status da instância ${instanceId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar status da instância.");
    }
};

/**
 * Busca a lista de instâncias da Evolution API salvas no CRM.
 */
export const listEvolutionInstancesApi = async () => {
    try {
        const response = await axiosInstance.get('/integrations/evolution/instances');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar instâncias da Evolution API:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao carregar as instâncias.");
    }
};


export const updateInstanceSettingsApi = async (instanceId, settings) => {
    try {
        const response = await axiosInstance.put(`/integrations/evolution/instance/${instanceId}/settings`, settings);
        return response.data.data;
    } catch (error) { console.error("Erro ao atualizar instancias da Evolution API:", error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao carregar as instâncias.");}
};

/**
 * Solicita a exclusão de uma instância da Evolution API.
 * @param {string} instanceId - O _id da instância no CRM.
 */
export const deleteEvolutionInstanceApi = async (instanceId) => {
    try {
        const response = await axiosInstance.delete(`/integrations/evolution/instance/${instanceId}`);
        return response.data.data;
    } catch (error) {
        console.error(`Erro ao excluir instância ${instanceId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao excluir a instância.");
    }
};


/**
 * Busca um QR Code que foi armazenado no cache do backend.
 * @param {string} instanceName - O nome da instância.
 * @returns {Promise<object>} Um objeto contendo o QR Code em base64 ou nulo.
 */
export const getQrCodeFromApi = async (instanceName) => {
    try {
        const response = await axiosInstance.get(`/integrations/evolution/instance/${instanceName}/qrcode`);
        return response.data.data; // Espera { qrcode: 'data:image/png;base64,...' } ou { qrcode: null }
    } catch (error) {
        console.error(`Erro ao buscar QR Code para ${instanceName}:`, error.response?.data || error.message);
        throw error.response?.data || new Error("Falha ao buscar o QR Code do servidor.");
    }
};