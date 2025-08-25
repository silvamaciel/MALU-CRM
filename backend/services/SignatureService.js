const axios = require('axios');
const PropostaContrato = require('../models/PropostaContrato');
const Company = require('../models/Company');
const Arquivo = require('../models/Arquivo');

/**
 * Envia um contrato do CRM para assinatura no Autentique.
 * @param {string} contratoId - O ID da PropostaContrato a ser enviada.
 * @param {string} companyId - O ID da empresa do utilizador logado (para segurança).
 * @returns {Promise<PropostaContrato>} O contrato atualizado com os dados do Autentique.
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
        company: companyId,
        'associations.kind': 'PropostaContrato',
        'associations.item': contratoId
    });

    if (!arquivoContrato || !arquivoContrato.url) {
        throw new Error("O ficheiro PDF deste contrato não foi encontrado no Drive. Por favor, gere o contrato novamente.");
    }
    
    const autentiqueApi = axios.create({
        baseURL: 'https://api.autentique.com.br/v2', // Remove a barra '/' do final
        headers: { 'Authorization': `Bearer ${contrato.company.autentiqueApiToken}` }
    });

    const signers = contrato.adquirentesSnapshot.map(adquirente => ({
        email: adquirente.email,
        action: 'SIGN',
    }));

    if (signers.length === 0) {
        throw new Error("O contrato não tem adquirentes (signatários) definidos.");
    }

    const payload = {
        document: {
            name: `Contrato de Venda - ${contrato.lead.nome}`,
            file: arquivoContrato.url
        },
        signers: signers,
    };
    
    try {
        console.log(`[SignatureSvc DEBUG] A enviar para Autentique. URL do ficheiro: ${payload.document.file}`);
        console.log(`[SignatureSvc DEBUG] Payload dos signatários:`, JSON.stringify(signers, null, 2));

        const response = await autentiqueApi.post('/documents', payload); // A chamada agora é para '/documents'

        const documentData = response.data.data;
        const documentId = documentData.id;
        console.log(`[SignatureSvc] Documento criado no Autentique com o ID: ${documentId}`);

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
        console.error("[SignatureSvc] ERRO DETALHADO da API do Autentique:", error.response?.data || error.message);
        throw new Error("Falha na comunicação com a API do Autentique.");
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