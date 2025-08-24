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

    // 1. Buscar o contrato e as informações associadas
    const contrato = await PropostaContrato.findOne({ _id: contratoId, company: companyId })
        .populate('company', 'autentiqueApiToken') // Popula apenas o token da empresa
        .populate('lead', 'nome'); // Popula o nome do lead para o título do documento

    if (!contrato) throw new Error("Contrato não encontrado ou não pertence a esta empresa.");
    if (!contrato.company?.autentiqueApiToken) {
        throw new Error("A sua empresa não configurou o token da API do Autentique. Por favor, vá à página de Integrações.");
    }

    // 2. Encontrar o ficheiro PDF do contrato no "Drive"
    // Assumimos que, ao gerar o contrato, um ficheiro foi criado e associado a ele.
    const arquivoContrato = await Arquivo.findOne({
        company: companyId,
        'associations.kind': 'PropostaContrato',
        'associations.item': contratoId
    });

    if (!arquivoContrato || !arquivoContrato.url) {
        throw new Error("O ficheiro PDF deste contrato não foi encontrado no Drive. Por favor, gere o contrato novamente.");
    }
    
    // 3. Preparar a chamada para a API do Autentique
    const autentiqueApi = axios.create({
        baseURL: 'https://api.autentique.com.br/v2/',
        headers: { 'Authorization': `Bearer ${contrato.company.autentiqueApiToken}` }
    });

    // 4. Mapear os adquirentes do contrato para o formato de signatários do Autentique
    const signers = contrato.adquirentesSnapshot.map(adquirente => ({
        email: adquirente.email,
        action: 'SIGN', // Ação de assinar
        // Outras informações podem ser adicionadas aqui, como 'name' e 'phone'
    }));

    // Adicione aqui outros signatários, como um representante da sua empresa, se necessário

    if (signers.length === 0) {
        throw new Error("O contrato não tem nenhum adquirente (signatário) definido.");
    }

    // 5. Montar o payload para a API do Autentique
    const payload = {
        document: {
            name: `Contrato de Venda - ${contrato.lead.nome}`,
            // O Autentique pode buscar o ficheiro diretamente da URL pública
            file: arquivoContrato.url
        },
        signers: signers,
        // sandbox: true // Use true para testes, se a API do Autentique suportar
    };

    console.log(`[SignatureSvc] A enviar documento para a API do Autentique...`);
    const response = await autentiqueApi.post('documents', payload);

    const documentData = response.data.data;
    const documentId = documentData.id;
    console.log(`[SignatureSvc] Documento criado no Autentique com o ID: ${documentId}`);

    // 6. Atualizar o seu PropostaContrato com os dados retornados
    contrato.autentiqueDocumentId = documentId;
    contrato.statusAssinatura = 'Aguardando Assinaturas';
    
    // Mapeia os signatários retornados para o seu schema
    contrato.signatarios = documentData.signers.map(signer => ({
        email: signer.email,
        autentiqueSignerId: signer.id,
        status: 'Pendente'
    }));
    
    await contrato.save();
    return contrato;
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