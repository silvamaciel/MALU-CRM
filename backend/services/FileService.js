const Arquivo = require('../models/Arquivo');
const { s3Client } = require('../config/s3'); // Importa o cliente S3 que configurámos
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Cria um registo de ficheiro no MongoDB após o upload para o S3/Spaces.
 * O upload em si é feito pelo middleware 'multer-s3'.
 * @param {object} file - O objeto 'file' fornecido pelo multer-s3.
 * @param {object} metadata - Metadados adicionais, como { categoria, associations }.
 * @param {string} companyId - ID da empresa.
 * @param {string} userId - ID do utilizador que fez o upload.
 * @returns {Promise<Arquivo>} O documento do arquivo salvo.
 */
const registrarArquivo = async (file, metadata, companyId, userId) => {
    if (!file) {
        throw new Error("Nenhum ficheiro recebido.");
    }
    if (!metadata || !metadata.categoria) {
        throw new Error("A categoria do ficheiro é obrigatória.");
    }

    const { originalname, mimetype, size, location, key } = file;
    const { categoria, associations } = metadata;

    const associationsArray = Array.isArray(associations) ? associations : [];

    const novoArquivo = new Arquivo({
        nomeOriginal: originalname,
        nomeNoBucket: key,
        url: location,
        mimetype,
        size,
        company: companyId,
        uploadedBy: userId,
        categoria: categoria,
        associations: associationsArray
    });

    await novoArquivo.save();
    console.log(`[FileService] Ficheiro '${originalname}' registado com sucesso no DB.`);
    return novoArquivo;
};


/**
 * Lista os ficheiros de uma empresa, permitindo filtros.
 */
const listarArquivos = async (companyId, filters = {}) => {
    const queryConditions = { company: companyId, ...filters };
    if (filters.associations) {
        try {
            const parsedAssociations = JSON.parse(filters.associations);
            queryConditions['associations.item'] = parsedAssociations.item;
            delete queryConditions.associations;
        } catch (e) {
            console.error("Erro ao fazer parse das associações de filtro.");
        }
    }
    return Arquivo.find(queryConditions)
        .populate('uploadedBy', 'nome')
        .sort({ createdAt: -1 });
};


/**
 * Apaga um ficheiro do DigitalOcean Spaces e do MongoDB.
 */
const apagarArquivo = async (arquivoId, companyId) => {
    const arquivo = await Arquivo.findOne({ _id: arquivoId, company: companyId });
    if (!arquivo) {
        throw new Error("Ficheiro não encontrado ou não pertence a esta empresa.");
    }

    const deleteParams = {
        Bucket: process.env.SPACES_BUCKET_NAME,
        Key: arquivo.nomeNoBucket,
    };

    try {
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log(`[FileService] Ficheiro '${arquivo.nomeNoBucket}' apagado do DigitalOcean Spaces.`);
        
        await Arquivo.deleteOne({ _id: arquivoId });
        console.log(`[FileService] Registo do ficheiro ID '${arquivoId}' apagado do MongoDB.`);
        
        return { message: "Ficheiro apagado com sucesso." };
    } catch (error) {
        console.error("[FileService] Erro ao apagar ficheiro do Space:", error);
        throw new Error("Falha ao apagar o ficheiro do armazenamento na nuvem.");
    }
};

module.exports = {
    registrarArquivo,
    listarArquivos,
    apagarArquivo
};