// services/integrationService.js
const axios = require('axios');
const Company = require('../models/Company');
const mongoose = require('mongoose');
const crypto = require('crypto');

const FB_APP_ID = process.env.VITE_FACEBOOK_APP_ID || process.env.REACT_APP_FACEBOOK_APP_ID; // Pega do mesmo lugar que o frontend
const FB_APP_SECRET = process.env.FB_APP_SECRET; // <<< PRECISA estar no .env do backend
const GRAPH_API_VERSION = 'v22.0';

// URL do seu endpoint que RECEBERÁ os leads do Facebook
const WEBHOOK_RECEIVER_URL = process.env.FB_WEBHOOK_RECEIVER_URL || 'https://074e-187-33-251-52.ngrok-free.app//api/webhooks/facebook/leads'; // Configurar

if (!FB_APP_SECRET) {
    console.error("ERRO FATAL: FB_APP_SECRET não definido no .env do backend!");
}
if (!process.env.FB_WEBHOOK_RECEIVER_URL && process.env.NODE_ENV !== 'development') {
     console.warn("AVISO: FB_WEBHOOK_RECEIVER_URL não definida no .env!");
}


/**
 * Finaliza a conexão de uma Página do Facebook, obtém token de página
 * de longa duração, salva no DB e inscreve no webhook de leadgen.
 */
const connectFacebookPageIntegration = async (pageId, shortLivedUserAccessToken, companyId) => {
    if (!pageId || !shortLivedUserAccessToken || !companyId) {
        throw new Error("Page ID, User Access Token e Company ID são necessários.");
    }
    if (!FB_APP_SECRET) throw new Error("Configuração do servidor incompleta (FB App Secret).");

    console.log(`[IntegSvc] Conectando Página ${pageId} para Empresa ${companyId}`);

    try {
        // 1. Trocar token de usuário de curta duração por um de longa duração
        console.log("[IntegSvc] Trocando User Token por Long-Lived User Token...");
        const longLivedUserTokenResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: FB_APP_ID,
                client_secret: FB_APP_SECRET,
                fb_exchange_token: shortLivedUserAccessToken
            }
        });
        const longLivedUserAccessToken = longLivedUserTokenResponse.data.access_token;
        if (!longLivedUserAccessToken) throw new Error("Falha ao obter Long-Lived User Token.");
        console.log("[IntegSvc] Long-Lived User Token obtido.");

        // 2. Obter o token de acesso da PÁGINA de longa duração usando o token do usuário
        console.log(`[IntegSvc] Obtendo Long-Lived Page Token para Página ${pageId}...`);
        const pageTokenResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}`, {
            params: {
                fields: 'access_token', // Pede especificamente o token da página
                access_token: longLivedUserAccessToken // Usa o token do usuário para pedir o da página
            }
        });
        const longLivedPageAccessToken = pageTokenResponse.data.access_token;
        if (!longLivedPageAccessToken) throw new Error("Falha ao obter Long-Lived Page Token.");
        console.log(`[IntegSvc] Long-Lived Page Token obtido para ${pageId}.`);

        // 3. Salvar Page ID e Page Access Token na Company
        console.log(`[IntegSvc] Atualizando Company ${companyId} com dados do FB...`);
        const company = await Company.findById(companyId);
        if (!company) throw new Error("Empresa não encontrada no banco de dados.");

        company.facebookPageId = pageId;
        company.facebookPageAccessToken = longLivedPageAccessToken; // <<< GUARDE COM SEGURANÇA!
        // Gera/recupera o verify token (se não existir, o default do schema gera)
        const verifyToken = company.facebookVerifyToken || crypto.randomBytes(16).toString('hex');
        if (!company.facebookVerifyToken) company.facebookVerifyToken = verifyToken;

        await company.save();
        console.log(`[IntegSvc] Company ${companyId} atualizada.`);

        // 4. Inscrever a Página no Webhook de Leadgen do seu App Meta
        console.log(`[IntegSvc] Inscrevendo Página ${pageId} no webhook leadgen...`);
        // Monta a URL completa do seu webhook receiver com o token único da empresa
        const companyWebhookToken = company.facebookWebhookToken || crypto.randomBytes(16).toString('hex');
         if (!company.facebookWebhookToken) {
             company.facebookWebhookToken = companyWebhookToken; // Salva se gerou agora
             await company.save();
         }
        const webhookCallbackUrl = `${WEBHOOK_RECEIVER_URL}?token=${companyWebhookToken}`; // URL que recebe os leads

        const subscribeResponse = await axios.post(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`,
            null, 
            { params: {
                subscribed_fields: 'leadgen',
                access_token: longLivedPageAccessToken 
            }}
        );

        if (!subscribeResponse.data.success) {
            console.error("[IntegSvc] Falha ao inscrever webhook:", subscribeResponse.data);
            throw new Error("Falha ao configurar o recebimento automático de leads no Facebook.");
        }
        console.log(`[IntegSvc] Webhook leadgen configurado com sucesso para Página ${pageId}!`);

        return { message: `Página ${pageId} conectada e configurada para receber leads!` };

    } catch (error) {
        console.error("[IntegSvc] Erro durante conexão da página FB:", error.response?.data?.error || error.message);
        const fbError = error.response?.data?.error;
        throw new Error(fbError?.message || error.message || "Erro ao conectar página do Facebook.");
    }
};


module.exports = {
    connectFacebookPageIntegration,
};