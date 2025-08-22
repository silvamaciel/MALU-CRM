import axiosInstance from "./axiosInstance";

export const listarArquivosApi = async (filters = {}) => {
    try {
        const response = await axiosInstance.get('/files', { params: filters });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar arquivos:", error.response?.data);
        throw error.response?.data || new Error("Falha ao carregar arquivos.");
    }
};

export const uploadArquivoApi = async (file, metadata, onUploadProgress) => {
    const formData = new FormData();
    formData.append('arquivo', file); // 'arquivo' deve ser o mesmo nome do middleware no backend
    formData.append('categoria', metadata.categoria);
    if (metadata.associations) {
        formData.append('associations', JSON.stringify(metadata.associations));
    }

    try {
        const response = await axiosInstance.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: onUploadProgress,
        });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao fazer upload do arquivo:", error.response?.data);
        throw error.response?.data || new Error("Falha no upload do arquivo.");
    }
};

export const apagarArquivoApi = async (arquivoId) => {
    try {
        const response = await axiosInstance.delete(`/files/${arquivoId}`);
        return response.data.data;
    } catch (error) {
        console.error("Erro ao apagar arquivo:", error.response?.data);
        throw error.response?.data || new Error("Falha ao apagar o arquivo.");
    }
};