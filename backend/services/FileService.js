const Arquivo = require('../models/Arquivo');
const Lead = require('../models/Lead');
const PropostaContrato = require('../models/PropostaContrato');
const Empreendimento = require('../models/Empreendimento');
const { s3Client } = require('../config/s3'); // Importa o cliente S3 que configurámos
const { DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

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

  // multipart/form-data entrega strings em req.body
  let { categoria, primaryAssociation, pasta } = metadata;

  if (typeof primaryAssociation === 'string') {
    try {
      primaryAssociation = JSON.parse(primaryAssociation);
    } catch (e) {
      console.warn('[FileService] primaryAssociation inválido (string não-JSON):', primaryAssociation);
      primaryAssociation = undefined;
    }
  }
  if (typeof categoria === 'string') categoria = categoria.trim();
  if (typeof pasta === 'string') pasta = pasta.trim();

  const { originalname, mimetype, size, location, key } = file;

  const associations = [];

  // --- Associação principal + cascatas ---
  if (primaryAssociation && primaryAssociation.kind && primaryAssociation.item) {
    associations.push({ kind: primaryAssociation.kind, item: primaryAssociation.item });

    // Se associado a Proposta/Contrato, agrega Lead e Imóvel/Empreendimento
    if (primaryAssociation.kind === 'PropostaContrato') {
      const contrato = await PropostaContrato
        .findById(primaryAssociation.item)
        .populate([
          { path: 'lead', select: '_id' },
          // imovel pode ser Unidade ou ImovelAvulso (ajuste os paths conforme seu schema)
          { path: 'imovel', select: '_id empreendimento' },
        ]);

      if (contrato) {
        if (contrato.lead?._id) {
          associations.push({ kind: 'Lead', item: contrato.lead._id });
        }

        if (contrato.imovel?._id) {
          // tenta respeitar o tipo já salvo no contrato
          const tipo = contrato.tipoImovel
            || (contrato.imovel?.empreendimento ? 'Unidade' : 'ImovelAvulso');

          associations.push({ kind: tipo, item: contrato.imovel._id });

          // se for Unidade, associa também ao Empreendimento pai
          if ((tipo === 'Unidade' || contrato.imovel?.empreendimento) && contrato.imovel.empreendimento) {
            associations.push({ kind: 'Empreendimento', item: contrato.imovel.empreendimento });
          }
        }
      }
    }

    // Se associado a Lead, agrega o imóvel de interesse (se existir)
    if (primaryAssociation.kind === 'Lead') {
      const lead = await Lead
        .findById(primaryAssociation.item)
        .populate('imovelInteresse'); // ajuste o path conforme seu schema

      if (lead && lead.imovelInteresse) {
        const tipoInt = lead.imovelInteresse?.tipo
          || (lead.imovelInteresse?.empreendimento ? 'Unidade' : 'ImovelAvulso');
        const idInt = lead.imovelInteresse?.id || lead.imovelInteresse?._id;

        if (tipoInt && idInt) {
          associations.push({ kind: tipoInt, item: idInt });
        }
        if (tipoInt === 'Unidade' && lead.imovelInteresse?.empreendimento) {
          associations.push({ kind: 'Empreendimento', item: lead.imovelInteresse.empreendimento });
        }
      }
    }
  }

  // Remove duplicados por "kind:item"
  const uniqueAssociations = Array.from(
    new Map(associations.map(a => [`${a.kind}:${a.item}`, a])).values()
  );

  const novoArquivo = new Arquivo({
    nomeOriginal: originalname,
    nomeNoBucket: key,
    url: location,
    mimetype,
    size,
    company: companyId,
    uploadedBy: userId,
    categoria,
    pasta: pasta || undefined, // subpasta opcional (ex.: "Imagens", "Plantas", "Documentos")
    associations: uniqueAssociations,
  });

  await novoArquivo.save();
  console.log(
    `[FileService] Ficheiro '${originalname}' registado (cat=${categoria}, pasta=${pasta || ''}) com ${uniqueAssociations.length} associação(ões).`
  );

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

    if (!filters.pasta) delete queryConditions.pasta;
    
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



const getPreviewStream = async (arquivoId, companyId) => {
  const arquivo = await Arquivo.findOne({ _id: arquivoId, company: companyId });
  if (!arquivo) throw new Error('Arquivo não encontrado ou não pertence a esta empresa.');

  const params = { Bucket: process.env.SPACES_BUCKET_NAME, Key: arquivo.nomeNoBucket };
  const data = await s3Client.send(new GetObjectCommand(params));

  return {
    stream: data.Body,                                      // Readable stream
    contentType: arquivo.mimetype || data.ContentType || 'application/octet-stream',
    filename: arquivo.nomeOriginal,
    contentLength: data.ContentLength,
    lastModified: data.LastModified,
  };
};


/**
 * Faz o upload de um buffer de ficheiro (ex: PDF gerado) para o S3/Spaces.
 * @param {Buffer} buffer - O conteúdo do ficheiro.
 *- @param {object} fileDetails - { originalname, mimetype, ... }.
- * @param {object} metadata - { categoria, primaryAssociation, ... }.
 * @returns {Promise<Arquivo>} O documento do arquivo salvo.
 */
const uploadBuffer = async (buffer, fileDetails, metadata, companyId, userId) => {
    const { originalname, mimetype } = fileDetails;
    const { categoria, primaryAssociation } = metadata;

    const key = `company-${companyId}/${categoria.toLowerCase().replace(' ', '-')}/${Date.now()}-${originalname}`;

    try {
        const parallelUploads3 = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.SPACES_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ACL: 'public-read',
                ContentType: mimetype,
            },
        });

        const result = await parallelUploads3.done();
        
        const fileDataForDb = {
            originalname: originalname,
            mimetype: mimetype,
            size: buffer.length,
            location: result.Location,
            key: result.Key
        };

        const arquivoSalvo = await registrarArquivo(fileDataForDb, { categoria, primaryAssociation }, companyId, userId);
        return arquivoSalvo;
    } catch (error) {
        console.error("[FileService] Erro ao fazer upload do buffer para o S3:", error);
        throw new Error("Falha ao guardar o arquivo no Drive.");
    }
};

module.exports = {
    registrarArquivo,
    listarArquivos,
    apagarArquivo,
    getPreviewStream,
    uploadBuffer
};