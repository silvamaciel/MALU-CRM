// services/integrationService.js
const axios = require("axios");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const crypto = require("crypto");

const FB_APP_ID =
  process.env.VITE_FACEBOOK_APP_ID || process.env.REACT_APP_FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const GRAPH_API_VERSION = "v22.0";

// URL do seu endpoint que RECEBERÁ os leads do Facebook
const WEBHOOK_RECEIVER_URL =
  process.env.FB_WEBHOOK_RECEIVER_URL ||
  "http://localhost:3000/api/webhooks/facebook/leads";

if (!FB_APP_SECRET) {
  console.error("ERRO FATAL: FB_APP_SECRET não definido no .env do backend!");
}
if (
  !process.env.FB_WEBHOOK_RECEIVER_URL &&
  process.env.NODE_ENV !== "development"
) {
  console.warn("AVISO: FB_WEBHOOK_RECEIVER_URL não definida no .env!");
}

/**
 * Finaliza a conexão de uma Página do Facebook, obtém token de página
 * de longa duração, salva no DB e inscreve a página no webhook de leadgen do app.
 */
const connectFacebookPageIntegration = async (
  pageId,
  shortLivedUserAccessToken,
  companyId
) => {
  if (!pageId || !shortLivedUserAccessToken || !companyId) {
    throw new Error("Page ID, User Access Token e Company ID são necessários.");
  }
  console.log(
    `[IntegSvc] Conectando Página ${pageId} para Empresa ${companyId}`
  );

  try {
    // 1. Trocar token de usuário de curta por longa duração (igual antes)
    console.log("[IntegSvc] Trocando User Token por Long-Lived...");
    const longLivedUserTokenResponse = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          fb_exchange_token: shortLivedUserAccessToken,
        },
      }
    );
    const longLivedUserAccessToken =
      longLivedUserTokenResponse.data.access_token;
    if (!longLivedUserAccessToken)
      throw new Error("Falha ao obter Long-Lived User Token.");
    console.log("[IntegSvc] Long-Lived User Token obtido.");

    // 2. Obter o token de acesso da PÁGINA de longa duração (igual antes)
    console.log(`[IntegSvc] Obtendo Long-Lived Page Token para ${pageId}...`);
    const pageTokenResponse = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}`,
      {
        params: {
          fields: "access_token",
          access_token: longLivedUserAccessToken,
        },
      }
    );
    const longLivedPageAccessToken = pageTokenResponse.data.access_token;
    if (!longLivedPageAccessToken)
      throw new Error("Falha ao obter Long-Lived Page Token.");
    console.log(`[IntegSvc] Long-Lived Page Token obtido para ${pageId}.`);

    // 3. Salvar Page ID e Page Access Token na Company
    console.log(
      `[IntegSvc] Atualizando Company ${companyId} com dados do FB...`
    );
    // Busca a Company para evitar que uma página já conectada seja sobrescrita por outra empresa
    const existingCompanyWithPage = await Company.findOne({
      facebookPageId: pageId,
      _id: { $ne: companyId },
    });
    if (existingCompanyWithPage) {
      throw new Error(
        `A Página do Facebook ID ${pageId} já está conectada à empresa ${existingCompanyWithPage.nome}.`
      );
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      {
        facebookPageId: pageId,
        facebookPageAccessToken: longLivedPageAccessToken,
        // Não precisamos mais de facebookWebhookToken ou facebookVerifyToken aqui
      },
      { new: true }
    );
    if (!company) throw new Error("Empresa não encontrada no banco de dados.");
    console.log(`[IntegSvc] Company ${companyId} atualizada.`);

    // 4. Inscrever a Página no Webhook de Leadgen do seu App Meta
    // A URL de callback usada aqui é a URL GERAL DO SEU APP configurada no painel da Meta.
    // O Facebook saberá qual página gerou o evento e enviará o Page ID no payload.
    console.log(
      `[IntegSvc] Inscrevendo Página ${pageId} no webhook leadgen do App...`
    );
    const subscribeResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`,
      null, // Sem corpo para esta requisição específica
      {
        params: {
          subscribed_fields: "leadgen", // Se inscreve para novos leads
          access_token: longLivedPageAccessToken, // <<< USA O TOKEN DA PÁGINA
        },
      }
    );

    if (
      !(
        subscribeResponse.data.success ||
        subscribeResponse.data.startsWith?.("Success")
      )
    ) {
      // API pode retornar {success:true} ou string "Success"
      console.error(
        "[IntegSvc] Falha ao inscrever webhook:",
        subscribeResponse.data
      );
      // Se falhar, talvez desfazer o save na Company? Ou apenas logar e avisar?
      throw new Error(
        "Falha ao configurar o recebimento de leads no Facebook."
      );
    }
    console.log(
      `[IntegSvc] Webhook leadgen configurado com sucesso para Página ${pageId}!`
    );

    return {
      message: `Página ${pageId} conectada e configurada para receber leads!`,
    };
  } catch (error) {
    console.error(
      "[IntegSvc] Erro durante conexão da página FB:",
      error.response?.data?.error || error.message
    );
    const fbError = error.response?.data?.error;
    throw new Error(
      fbError?.message ||
        error.message ||
        "Erro ao conectar página do Facebook."
    );
  }
};

module.exports = {
  connectFacebookPageIntegration,
};
