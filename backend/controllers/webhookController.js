// controllers/webhookController.js
const crypto = require('crypto'); // Para validar assinatura
const webhookService = require('../services/webhookService');
const Company = require('../models/Company'); // Para buscar company pelo token

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN; // Token para verificação GET
const FB_APP_SECRET = process.env.FB_APP_SECRET; // Segredo para assinatura POST

/**
 * Lida com a requisição GET de verificação do Facebook Webhook.
 */
const verifyFacebookWebhook = (req, res) => {
    console.log("[WebhookCtrl] Recebido GET de verificação do Facebook.");
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verifica se mode e token estão presentes e batem com o esperado
    if (mode && token) {
        if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
            console.log("[WebhookCtrl] VERIFY_TOKEN bateu! Respondendo com challenge...");
            res.status(200).send(challenge); // Responde com o challenge recebido
        } else {
            console.warn("[WebhookCtrl] Falha na verificação: Modo ou Token inválido.");
            res.sendStatus(403); // Forbidden
        }
    } else {
         console.warn("[WebhookCtrl] Falha na verificação: Parâmetros faltando.");
         res.sendStatus(400); // Bad request
    }
};

/**
 * Valida a assinatura da requisição POST vinda do Facebook.
 */
const validateFacebookSignature = (req) => {
    if (!FB_APP_SECRET) {
        console.error("[WebhookCtrl] FB_APP_SECRET não está configurado! Não é possível validar assinatura.");
        return false; // Falha segura
    }
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.warn("[WebhookCtrl] Assinatura 'x-hub-signature-256' não encontrada no header.");
        return false;
    }
 
    if (req.rawBody) {
        console.log("DEBUG SIGNATURE: req.rawBody recebido pelo backend (como string UTF-8):\n---\n" + req.rawBody.toString('utf8') + "\n---");
    } else {
        console.error("DEBUG SIGNATURE: req.rawBody está UNDEFINED! Verifique o middleware express.json({ verify: ... }) em server.js");
        return false; 
    }
    
    const signatureHash = signature.split('=')[1];
    if (!signatureHash) {
         console.warn("[WebhookCtrl] Formato inválido da assinatura no header.");
         return false;
    }

    // Calcula o hash esperado usando o corpo cru da requisição
    const expectedHash = crypto
        .createHmac('sha256', FB_APP_SECRET)
        .update(req.rawBody) // <<< USA O CORPO CRU que salvamos no server.js
        .digest('hex');

    if (signatureHash !== expectedHash) {
        console.warn("[WebhookCtrl] Assinatura inválida! Hash esperado:", expectedHash, "Recebido:", signatureHash);
        return false;
    }

    console.log("[WebhookCtrl] Assinatura validada com sucesso!");
    return true;
};


/**
 * Lida com a requisição POST contendo dados de leads do Facebook.
 * Identifica a empresa pelo PAGE ID no payload do webhook.
 */
const handleFacebookLeadWebhook = async (req, res) => {
    console.log("[WebhookCtrl] Recebido POST do Facebook Webhook.");
    console.log("[WebhookCtrl] Body:", JSON.stringify(req.body, null, 2)); // Log para ver estrutura

    // 1. Validar Assinatura (igual antes)
    if (!validateFacebookSignature(req)) {
        return res.sendStatus(403); // Forbidden
    }

    // 2. Identificar a Empresa pelo PAGE ID no payload
    let company = null;
    let companyFound = false;
    let creatorOrResponsibleUserId = null;

    try {
        // O Facebook envia um array 'entry', geralmente com 1 item para webhooks de lead
        if (req.body.object === 'page' && req.body.entry && req.body.entry.length > 0) {
            for (const entry of req.body.entry) {
                const pageIdFromWebhook = entry.id; // <<< ID DA PÁGINA que gerou o evento
                if (!pageIdFromWebhook) {
                    console.warn("[WebhookCtrl] ID da Página não encontrado no entry do webhook:", entry);
                    continue; // Próximo entry, se houver
                }

                // Busca a empresa CRM que tem este facebookPageId registrado
                company = await Company.findOne({ facebookPageId: pageIdFromWebhook })
                                        .select('nome linkedFacebookForms facebookConnectedByUserId')
                                        .lean();

                if (!company) {
                    console.error(`[WebhookCtrl] Nenhuma Empresa CRM encontrada para Page ID: ${pageIdFromWebhook}`);
                    continue; // Se esta página não está ligada a nenhuma empresa no CRM, ignora
                }
                companyFound = true;
                creatorOrResponsibleUserId = company.facebookConnectedByUserId || null;
                console.log(`[WebhookCtrl] Webhook para Empresa: ${company.nome} (ID: ${company._id}), PageID: ${pageIdFromWebhook}, ConectadoPor: ${creatorOrResponsibleUserId}`);

                // Processa as 'changes' dentro do entry
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        console.log("[WebhookCtrl] Evento leadgen recebido. Processando com webhookService...");
                        // Passa o 'value' do change (que contém leadgen_id, form_id, field_data, etc.)
                        // e o company._id encontrado
                        await webhookService.processFacebookLead(change.value, company._id, creatorOrResponsibleUserId);                    }
                }
            }
        } else {
            console.warn("[WebhookCtrl] Payload do webhook não tem o formato esperado (object page ou entry).");
        }

        if (!companyFound && req.body.entry && req.body.entry.length > 0) {
             console.error("[WebhookCtrl] Nenhum lead processado pois nenhuma empresa CRM correspondeu aos Page IDs recebidos.");
        }

        // 3. Responder 200 OK para o Facebook IMEDIATAMENTE
        console.log("[WebhookCtrl] Evento(s) processado(s). Enviando 200 OK para Facebook.");
        res.sendStatus(200);

    } catch (error) {
         // Mesmo se der erro ao processar/criar o lead, respondemos 200 OK para o FB
         console.error(`[WebhookCtrl] Erro CRÍTICO ao processar webhook:`, error);
         res.sendStatus(200); // Ainda responde 200 OK!
    }
};

module.exports = {
    verifyFacebookWebhook,
    handleFacebookLeadWebhook
};