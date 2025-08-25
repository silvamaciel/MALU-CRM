const axios = require('axios');
const PropostaContrato = require('../models/PropostaContrato');
const FormData = require('form-data');
const Company = require('../models/Company');
const Arquivo = require('../models/Arquivo');

/**
 * Envia um contrato do CRM para assinatura via API GraphQL do Autentique.
 * @param {string} contratoId - O ID da PropostaContrato.
 * @param {string} companyId - O ID da empresa.
 * @returns {Promise<PropostaContrato>} O contrato atualizado.
 */
const enviarParaAssinatura = async (contratoId, companyId) => {
    console.log(`[SignatureSvc] Iniciando envio para assinatura do contrato: ${contratoId}`);

    // 1. Buscar o contrato e as informações associadas
    const contrato = await PropostaContrato.findOne({ _id: contratoId, company: companyId })
        .populate('company', 'autentiqueApiToken')
        .populate('lead', 'nome');

    if (!contrato) throw new Error("Contrato não encontrado.");
    if (!contrato.company?.autentiqueApiToken) {
        throw new Error("A sua empresa não configurou o token da API do Autentique.");
    }

    // 2. Encontrar o ficheiro PDF do contrato no "Drive"
    const arquivoContrato = await Arquivo.findOne({
        'associations.kind': 'PropostaContrato',
        'associations.item': contratoId
    });

    if (!arquivoContrato || !arquivoContrato.url) {
        throw new Error("O ficheiro PDF deste contrato não foi encontrado no Drive.");
    }
    
    // 3. Mapear os signatários
    const signers = contrato.adquirentesSnapshot.map(adquirente => ({
        email: adquirente.email,
        action: 'SIGN',
        name: adquirente.nome // Adicionar o nome para uma melhor experiência
    }));

    if (signers.length === 0) {
        throw new Error("O contrato não tem adquirentes (signatários) definidos.");
    }

    // 4. Montar a query GraphQL
    const mutation = `
        mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
            createDocument(
                document: $document,
                signers: $signers,
                file: $file
            ) {
                id
                name
            }
        }
    `;
    
    try {
        // 5. Preparar o payload multipart/form-data
        const formData = new FormData();
        
        const operations = {
            query: mutation,
            variables: {
                document: { name: `Contrato de Venda - ${contrato.lead.nome}` },
                signers: signers,
                file: null // O ficheiro será mapeado abaixo
            }
        };
        formData.append('operations', JSON.stringify(operations));
        
        // Mapeia o ficheiro para a variável 'file' da mutation
        formData.append('map', JSON.stringify({ 'file_data': ['variables.file'] }));
        
        // Faz o download do ficheiro do seu DigitalOcean Spaces para um buffer
        const fileResponse = await axios.get(arquivoContrato.url, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileResponse.data);

        // Anexa o buffer ao formulário
        formData.append('file_data', fileBuffer, { filename: arquivoContrato.nomeOriginal });

        console.log(`[SignatureSvc] A enviar documento para a API GraphQL do Autentique...`);
        
        // 6. Enviar a requisição para o Autentique
        const response = await axios.post('https://api.autentique.com.br/v2/graphql', formData, {
            headers: {
                'Authorization': `Bearer ${contrato.company.autentiqueApiToken}`,
                ...formData.getHeaders() // Adiciona os headers de 'multipart/form-data'
            }
        });

        if (response.data.errors) {
            console.error("[SignatureSvc] Erro retornado pela API GraphQL do Autentique:", response.data.errors);
            throw new Error(response.data.errors[0].message);
        }

        const documentData = response.data.data.createDocument;
        const documentId = documentData.id;
        console.log(`[SignatureSvc] Documento criado no Autentique com o ID: ${documentId}`);

        // 7. Atualizar o seu PropostaContrato com os dados retornados
        contrato.autentiqueDocumentId = documentId;
        contrato.statusAssinatura = 'Aguardando Assinaturas';
        contrato.signatarios = documentData.signers.map(signer => ({
            email: signer.email,
            autentiqueSignerId: signer.id,
            status: 'Pendente'
        }));
        
        await contrato.save();
        return contrato;

    } catch (error) {
        // Log detalhado do erro, se houver
        console.error("[SignatureSvc] ERRO DETALHADO na comunicação com a API do Autentique:", error.response?.data || error.message);
        // Retorna uma mensagem de erro mais amigável
        throw new Error(error.response?.data?.errors?.[0]?.message || "Falha na comunicação com a API do Autentique.");
    }
};


/**
 * Processa webhooks vindos do Autentique para atualizar o status das assinaturas.
 */
const handleAutentiqueWebhook = async (payload) => {
    const documentId = payload.document?.id;
    if (!documentId) {
        console.warn("[SignatureSvc] Webhook do Autentique recebido sem ID de documento.");
        return;
    }

    console.log(`[SignatureSvc] Webhook recebido para o documento do Autentique: ${documentId}`);
    const contrato = await PropostaContrato.findOne({ autentiqueDocumentId: documentId });
    if (!contrato) {
        console.warn(`[SignatureSvc] Nenhum contrato encontrado no CRM com o ID do Autentique: ${documentId}`);
        return;
    }

    const eventName = payload.event?.name;
    
    if (eventName === 'signer_signed') { // Alguém assinou
        const signerEmail = payload.signer?.email;
        const signatario = contrato.signatarios.find(s => s.email === signerEmail);
        if (signatario) {
            signatario.status = 'Assinado';
            console.log(`[SignatureSvc] Signatário ${signerEmail} marcou o contrato ${contrato._id} como assinado.`);
        }
    } else if (eventName === 'document_signed') { // Todos assinaram
        contrato.statusAssinatura = 'Finalizado';
        contrato.statusPropostaContrato = 'Vendido'; // Opcional: atualiza o status geral
        contrato.dataVendaEfetivada = new Date();
        console.log(`[SignatureSvc] Contrato ${contrato._id} foi finalizado por todos os signatários.`);
    } else if (eventName === 'document_rejected') { // Documento recusado
        contrato.statusAssinatura = 'Recusado';
        console.log(`[SignatureSvc] Contrato ${contrato._id} foi recusado.`);
    }
    
    await contrato.save();
};


module.exports = {
    enviarParaAssinatura,
    handleAutentiqueWebhook
};