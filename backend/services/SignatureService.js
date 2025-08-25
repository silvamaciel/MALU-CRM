const axios = require('axios');
const PropostaContrato = require('../models/PropostaContrato');
const FormData = require('form-data');
const Company = require('../models/Company');
const Arquivo = require('../models/Arquivo');

/**
 * Envia um contrato para assinatura, incluindo a lista de signatários e as suas posições.
 * @param {string} contratoId - O ID da PropostaContrato.
 * @param {string} companyId - O ID da empresa.
 * @param {Array<object>} signersFromFrontend - Lista de signatários customizada do frontend.
 * @returns {Promise<PropostaContrato>} O contrato atualizado.
 */
const enviarParaAssinatura = async (contratoId, companyId, signersFromFrontend) => {
    console.log(`[SignatureSvc] Iniciando envio para assinatura do contrato: ${contratoId}`);

    // 1. Buscar o contrato e as informações associadas
    const contrato = await PropostaContrato.findOne({ _id: contratoId, company: companyId })
        .populate('company', 'autentiqueApiToken')
        .populate('lead', 'nome');

    if (!contrato) throw new Error("Contrato não encontrado.");
    if (!contrato.company?.autentiqueApiToken) {
        throw new Error("A sua empresa não configurou o token da API do Autentique.");
    }
    if (!signersFromFrontend || signersFromFrontend.length === 0) {
        throw new Error("Pelo menos um signatário é obrigatório.");
    }

    // 2. Encontrar o ficheiro PDF do contrato no "Drive"
    const arquivoContrato = await Arquivo.findOne({
        'associations.kind': 'PropostaContrato',
        'associations.item': contratoId
    });
    if (!arquivoContrato || !arquivoContrato.url) {
        throw new Error("O ficheiro PDF deste contrato não foi encontrado no Drive.");
    }
    
    // 3. Mapear os signatários do frontend para o formato que a API GraphQL do Autentique espera
    const signersForApi = signersFromFrontend.map(s => ({
        email: s.email,
        action: 'SIGN',
        name: s.name,
        positions: [{ // O Autentique espera um array de posições
            x: String(s.pos_x), // Posição X em percentagem (0.0 a 100.0)
            y: String(s.pos_y), // Posição Y em percentagem (0.0 a 100.0)
            z: String(s.page)   // O número da página (começando em 1)
        }]
    }));
    
    // 4. Montar a query GraphQL
    const mutation = `
        mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
            createDocument(document: $document, signers: $signers, file: $file) {
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
                signers: signersForApi, // <<< USA A NOVA LISTA DE SIGNATÁRIOS COM POSIÇÕES
                file: null
            }
        };
        formData.append('operations', JSON.stringify(operations));
        formData.append('map', JSON.stringify({ 'file_data': ['variables.file'] }));
        
        const fileResponse = await axios.get(arquivoContrato.url, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileResponse.data);
        formData.append('file_data', fileBuffer, { filename: arquivoContrato.nomeOriginal });

        // 6. Enviar a requisição para o Autentique
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
        
        // 7. Atualizar o seu PropostaContrato
        contrato.autentiqueDocumentId = documentData.id;
        contrato.statusAssinatura = 'Aguardando Assinaturas';
        contrato.signatarios = signersFromFrontend.map(s => ({
            email: s.email,
            nome: s.name,
            status: 'Pendente'
        }));
        
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