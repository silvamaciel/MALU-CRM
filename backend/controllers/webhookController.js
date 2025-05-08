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
 */
const handleFacebookLeadWebhook = async (req, res) => {
    console.log("[WebhookCtrl] Recebido POST do Facebook Webhook.");

    // 1. Validar Assinatura (SEGURANÇA ESSENCIAL!)
    if (!validateFacebookSignature(req)) {
        return res.sendStatus(403); // Forbidden se assinatura for inválida
    }

    // 2. Identificar a Empresa pelo token na URL
    const companyToken = req.query.token; // Pega token da URL: ?token=XYZ
    if (!companyToken) {
        console.error("[WebhookCtrl] Token da empresa não encontrado na URL do webhook.");
        return res.sendStatus(400); // Bad Request
    }

    let company = null;
    try {
         // Busca a empresa pelo token único dela (campo a criar no Model Company)
         company = await Company.findOne({ facebookWebhookToken: companyToken }).lean();
         if (!company) {
             console.error(`[WebhookCtrl] Empresa não encontrada para o token: ${companyToken}`);
             return res.sendStatus(404); // Not Found
         }
         console.log(`[WebhookCtrl] Webhook recebido para Empresa: ${company.nome} (ID: ${company._id})`);

         // 3. Processar o Payload do Webhook
         // O Facebook pode enviar múltiplos 'entries' ou 'changes'
         if (req.body.object === 'page') {
             for (const entry of req.body.entry) {
                 for (const change of entry.changes) {
                     if (change.field === 'leadgen') {
                         // Chama o serviço para processar o lead
                         await webhookService.processFacebookLead(change.value, company._id);
                     }
                 }
             }
         }

         // 4. Responder 200 OK para o Facebook IMEDIATAMENTE
         console.log("[WebhookCtrl] Evento processado. Enviando 200 OK para Facebook.");
         res.sendStatus(200);

    } catch (error) {
         // Mesmo se der erro ao processar/criar o lead, respondemos 200 OK para o FB
         // para ele não ficar reenviando o webhook. Logamos o erro internamente.
         console.error(`[WebhookCtrl] Erro ao processar webhook para Company ${company?._id || 'desconhecida'} (token: ${companyToken}):`, error);
         res.sendStatus(200); // Ainda responde 200 OK!
    }
};


module.exports = {
    verifyFacebookWebhook,
    handleFacebookLeadWebhook
};