const Arquivo = require('../models/Arquivo');
const Lead = require('../models/Lead');
const PropostaContrato = require('../models/PropostaContrato');
const Empreendimento = require('../models/Empreendimento');
const { s3Client } = require('../config/s3'); // Importa o cliente S3 que configurámos
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Cria um registo de ficheiro no MongoDB, deduzindo e salvando
 * associações em cascata.
 * @param {object} file - O objeto 'file' do multer-s3.
 * @param {object} metadata - { categoria, primaryAssociation: { kind, item } }.
 * @param {string} companyId - ID da empresa.
 * @param {string} userId - ID do utilizador que fez o upload.
 */
const registrarArquivo = async (file, metadata, companyId, userId) => {
    if (!file) throw new Error("Nenhum ficheiro recebido.");
    if (!metadata || !metadata.categoria) throw new Error("A categoria do ficheiro é obrigatória.");

    const { originalname, mimetype, size, location, key } = file;
    const { categoria, primaryAssociation } = metadata;

    let associations = [];

    // --- Motor de Associação em Cascata ---
    if (primaryAssociation && primaryAssociation.kind && primaryAssociation.item) {
        associations.push(primaryAssociation); // Adiciona a associação principal

        // Se o ficheiro for associado a um Contrato, associa também ao Lead e ao Imóvel/Empreendimento
        if (primaryAssociation.kind === 'PropostaContrato') {
            const contrato = await PropostaContrato.findById(primaryAssociation.item).populate('lead imovel');
            if (contrato) {
                if (contrato.lead) {
                    associations.push({ kind: 'Lead', item: contrato.lead._id });
                }
                if (contrato.imovel) {
                    // Adiciona a associação ao ImovelAvulso ou Unidade
                    associations.push({ kind: contrato.tipoImovel, item: contrato.imovel._id });
                    // Se for uma Unidade, podemos ir mais fundo e associar ao Empreendimento pai
                    if (contrato.tipoImovel === 'Unidade' && contrato.imovel.empreendimento) {
                        associations.push({ kind: 'Empreendimento', item: contrato.imovel.empreendimento });
                    }
                }
            }
        }

        // Se o ficheiro for associado a um Lead, associa também ao seu imóvel de interesse
        if (primaryAssociation.kind === 'Lead') {
            const lead = await Lead.findById(primaryAssociation.item).populate('imovelInteresse'); // Supondo que exista o campo 'imovelInteresse'
            if (lead && lead.imovelInteresse) {
                associations.push({ kind: lead.imovelInteresse.tipo, item: lead.imovelInteresse.id });
            }
        }
    }
    
    // Remove duplicados, caso existam
    const uniqueAssociations = Array.from(new Map(associations.map(a => [a.item.toString(), a])).values());

    const novoArquivo = new Arquivo({
        nomeOriginal: originalname,
        nomeNoBucket: key,
        url: location,
        mimetype, size, company: companyId, uploadedBy: userId,
        categoria: categoria,
        associations: uniqueAssociations
    });

    await novoArquivo.save();
    console.log(`[FileService] Ficheiro '${originalname}' registado com ${uniqueAssociations.length} associações.`);
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