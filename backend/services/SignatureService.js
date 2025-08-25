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
    console.log(`[SignatureSvc] A iniciar processo de envio para assinatura do contrato: ${contratoId}`);

    const contrato = await PropostaContrato.findOne({ _id: contratoId, company: companyId })
        .populate('company', 'autentiqueApiToken')
        .populate('lead', 'nome');

    if (!contrato) throw new Error("Contrato não encontrado.");
    if (!contrato.company?.autentiqueApiToken) {
        throw new Error("A sua empresa não configurou o token da API do Autentique.");
    }

    const arquivoContrato = await Arquivo.findOne({
        'associations.kind': 'PropostaContrato',
        'associations.item': contratoId
    });
    if (!arquivoContrato || !arquivoContrato.url) {
        throw new Error("O ficheiro PDF deste contrato não foi encontrado no Drive.");
    }
    
    const signers = contrato.adquirentesSnapshot.map(adquirente => ({
        email: adquirente.email,
        action: 'SIGN',
        name: adquirente.nome
    }));

    if (signers.length === 0) {
        throw new Error("O contrato não tem adquirentes (signatários) definidos.");
    }

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
        const formData = new FormData();
        const operations = {
            query: mutation,
            variables: {
                document: { name: `Contrato de Venda - ${contrato.lead.nome}` },
                signers: signers,
                file: null
            }
        };
        formData.append('operations', JSON.stringify(operations));
        formData.append('map', JSON.stringify({ 'file_data': ['variables.file'] }));
        
        const fileResponse = await axios.get(arquivoContrato.url, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileResponse.data);
        formData.append('file_data', fileBuffer, { filename: arquivoContrato.nomeOriginal });

        const response = await axios.post('https://api.autentique.com.br/v2/graphql', formData, {
            headers: {
                'Authorization': `Bearer ${contrato.company.autentiqueApiToken}`,
                ...formData.getHeaders()
            }
        });

        if (response.data.errors) {
            throw new Error(response.data.errors[0].message);
        }

        const documentData = response.data.data.createDocument;
        contrato.autentiqueDocumentId = documentData.id;
        contrato.statusAssinatura = 'Aguardando Assinaturas';

        // VVVVV A CORREÇÃO ESTÁ AQUI VVVVV
        // Mapeia os signatários que NÓS ENVIÁMOS (a variável 'signers')
        // para o schema do nosso contrato.
        contrato.signatarios = signers.map(signer => ({
            email: signer.email,
            nome: signer.name,
            // O autentiqueSignerId virá depois via webhook, por agora o status é o mais importante.
            status: 'Pendente'
        }));
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        
        await contrato.save();
        return contrato;

    } catch (error) {
        console.error("[SignatureSvc] ERRO DETALHADO na comunicação com a API do Autentique:", error.response?.data || error.message);
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