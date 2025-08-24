import axiosInstance from "./axiosInstance";

/**
 * Lista os arquivos com base em filtros.
 * @param {object} filters - Ex: { categoria: 'Contratos' } ou { associations: JSON.stringify({ item: 'leadId' }) }
 */
export const listarArquivosApi = async (filters = {}) => {
    try {
        const response = await axiosInstance.get('/files', { params: filters });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar arquivos:", error.response?.data);
        throw error.response?.data || new Error("Falha ao carregar arquivos.");
    }
};

/**
 * Faz o upload de um novo arquivo com metadados.
 * @param {File} file - O ficheiro a ser enviado.
 * @param {object} metadata - { categoria, primaryAssociation: { kind, item } }.
 * @param {function} onUploadProgress - Callback para monitorizar o progresso.
 */
export const uploadArquivoApi = async (file, metadata, onUploadProgress) => {
    const formData = new FormData();
    formData.append('arquivo', file); // 'arquivo' deve ser o mesmo nome do middleware no backend
    formData.append('categoria', metadata.categoria);
    if (metadata.primaryAssociation) {
        // O backend espera que a associação primária seja uma string JSON
        formData.append('primaryAssociation', JSON.stringify(metadata.primaryAssociation));
    }

    if (metadata.pasta) {
        formData.append('pasta', metadata.pasta);
    }
    try {
        const response = await axiosInstance.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao fazer upload do arquivo:", error.response?.data);
        throw error.response?.data || new Error("Falha no upload do arquivo.");
    }
};

/**
 * Apaga um arquivo.
 * @param {string} arquivoId - O _id do arquivo no MongoDB.
 */
export const apagarArquivoApi = async (arquivoId) => {
    try {
        const response = await axiosInstance.delete(`/files/${arquivoId}`);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao apagar arquivo:", error.response?.data);
        throw error.response?.data || new Error("Falha ao apagar o arquivo.");
    }
};