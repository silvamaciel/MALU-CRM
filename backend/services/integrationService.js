// services/integrationService.js
const axios = require("axios");
const Company = require("../models/Company");
const mongoose = require("mongoose");
// const crypto = require("crypto"); // Removido pois não estamos mais gerando tokens de webhook por empresa aqui

// <<< Lendo variáveis de ambiente do backend diretamente
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const GRAPH_API_VERSION = "v22.0";
const WEBHOOK_RECEIVER_URL_FROM_ENV = process.env.FB_WEBHOOK_RECEIVER_URL;

// Verificações de inicialização
if (!FACEBOOK_APP_ID || !FB_APP_SECRET) {
  console.error(
    "ERRO FATAL DE CONFIGURAÇÃO: FACEBOOK_APP_ID ou FB_APP_SECRET não estão definidos nas variáveis de ambiente do backend!"
  );
  // Em um cenário real, você poderia impedir o app de iniciar aqui
  // throw new Error("Configuração crítica do Facebook faltando no servidor.");
}
if (!WEBHOOK_RECEIVER_URL_FROM_ENV && process.env.NODE_ENV !== "development") {
  console.warn(
    "AVISO DE CONFIGURAÇÃO: FB_WEBHOOK_RECEIVER_URL não definida no .env do backend!"
  );
}

/**
 * Finaliza a conexão de uma Página do Facebook, obtém token de página
 * de longa duração, salva no DB e inscreve a página no webhook de leadgen do app.
 * @param {string} pageId - ID da Página do Facebook.
 * @param {string} shortLivedUserAccessToken - Token de acesso do usuário de curta duração.
 * @param {string} companyId - ID da Empresa CRM.
 * @returns {Promise<object>} - Mensagem de sucesso.
 */
const connectFacebookPageIntegration = async (
  pageId,
  shortLivedUserAccessToken,
  companyId
) => {
  if (!pageId || !shortLivedUserAccessToken || !companyId) {
    throw new Error("Page ID, User Access Token e Company ID são necessários.");
  }
  if (!FACEBOOK_APP_ID || !FB_APP_SECRET) { // Garante que as credenciais do app foram carregadas
    throw new Error("Configuração do servidor para Facebook incompleta (App ID ou Secret faltando).");
  }
  console.log(
    `[IntegSvc connect] Iniciando conexão da Página ${pageId} para Empresa ${companyId}`
  );

  try {
    // 1. Trocar token de usuário de curta duração por um de longa duração
    console.log("[IntegSvc connect] Trocando User Token por Long-Lived User Token...");
    const longLivedUserTokenResponse = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: FACEBOOK_APP_ID,
          client_secret: FB_APP_SECRET,
          fb_exchange_token: shortLivedUserAccessToken,
        },
      }
    );
    const longLivedUserAccessToken = longLivedUserTokenResponse.data.access_token;
    if (!longLivedUserAccessToken) {
      throw new Error("Falha ao obter Long-Lived User Token do Facebook.");
    }
    console.log("[IntegSvc connect] Long-Lived User Token obtido.");

    // 2. Obter o token de acesso da PÁGINA de longa duração
    console.log(`[IntegSvc connect] Obtendo Long-Lived Page Token para Página ${pageId}...`);
    const pageTokenResponse = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}`,
      {
        params: {
          fields: "access_token", // Pede especificamente o token da página
          access_token: longLivedUserAccessToken,
        },
      }
    );
    const longLivedPageAccessToken = pageTokenResponse.data.access_token;
    if (!longLivedPageAccessToken) {
      throw new Error("Falha ao obter Long-Lived Page Token do Facebook.");
    }
    console.log(`[IntegSvc connect] Long-Lived Page Token obtido para ${pageId}.`);

    // 3. Salvar Page ID e Page Access Token na Company
    console.log(`[IntegSvc connect] Atualizando Company ${companyId} com dados do FB...`);
    // Verifica se a página já está conectada a OUTRA empresa
    const existingCompanyWithPage = await Company.findOne({
        facebookPageId: pageId,
        _id: { $ne: companyId }, // $ne = Not Equal (diferente do companyId atual)
    });
    if (existingCompanyWithPage) {
        throw new Error(
            `A Página do Facebook ID ${pageId} já está conectada à empresa ${existingCompanyWithPage.nome}. Uma página só pode ser conectada a uma empresa por vez.`
        );
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        facebookPageId: pageId,
        facebookPageAccessToken: longLivedPageAccessToken,
      },
      { new: true } // Retorna o documento atualizado
    );
    if (!updatedCompany) {
      throw new Error("Empresa não encontrada no banco de dados para salvar dados do Facebook.");
    }
    console.log(`[IntegSvc DEBUG connect] Company atualizada no DB: PageID=${updatedCompany.facebookPageId}, PageTokenExists=${!!updatedCompany.facebookPageAccessToken}`);


    // 4. Inscrever a Página no Webhook de Leadgen do seu App Meta
    // A URL de callback usada aqui é a URL GERAL DO SEU APP configurada no painel da Meta.
    console.log(`[IntegSvc connect] Inscrevendo Página ${pageId} no webhook 'leadgen' do App...`);
    const subscribeResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`,
      null, // O corpo é nulo para esta requisição
      {
        params: {
          subscribed_fields: "leadgen", // Se inscreve APENAS para novos leads
          access_token: longLivedPageAccessToken, // USA O TOKEN DA PÁGINA para inscrever
        },
      }
    );

    // A API da Meta pode retornar {success:true} ou uma string "Success" em alguns casos
    const wasSuccessful = subscribeResponse.data.success === true ||
                          (typeof subscribeResponse.data === 'string' && subscribeResponse.data.toLowerCase().includes("success"));

    if (!wasSuccessful) {
      console.error("[IntegSvc connect] Falha ao inscrever webhook:", subscribeResponse.data);
      // Considerar se deve desfazer o salvamento na Company ou apenas logar e avisar.
      // Por enquanto, lança erro.
      throw new Error("Falha ao configurar o recebimento automático de leads no Facebook.");
    }
    console.log(`[IntegSvc connect] Webhook 'leadgen' configurado com sucesso para Página ${pageId}!`);

    return { message: `Página ${pageId} conectada e configurada para receber leads!` };

  } catch (error) {
    console.error("[IntegSvc connect] Erro durante conexão da página FB:", error.response?.data?.error || error.message);
    const fbError = error.response?.data?.error; // Tenta pegar erro específico da API Graph
    // Se fbError.message existir, ele é mais descritivo
    throw new Error(fbError?.message || error.message || "Erro desconhecido ao conectar página do Facebook.");
  }
};

/**
 * Verifica o status da integração com o Facebook para uma empresa.
 * @param {string} companyId - ID da empresa CRM.
 * @returns {Promise<object>} - Objeto com { isConnected: boolean, pageId?: string, pageName?: string }
 */
const getFacebookIntegrationStatus = async (companyId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error('ID da empresa inválido para verificar status da integração.');
  }
  console.log(`[IntegSvc getStatus] Verificando status da integração FB para Empresa ${companyId}`);
  try {
    const company = await Company.findById(companyId)
      .select('nome facebookPageId facebookPageAccessToken') // Seleciona campos
      .lean();

    console.log(`[IntegSvc DEBUG getStatus] Documento Company encontrado no DB:`, JSON.stringify(company, null, 2));

    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    if (company.facebookPageId && company.facebookPageAccessToken) {
      let pageName = 'Nome da Página Indisponível'; // Default se não conseguir buscar
      try {
        console.log(`[IntegSvc getStatus] Buscando nome para Page ID ${company.facebookPageId}`);
        const pageDetailsResponse = await axios.get(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${company.facebookPageId}`,
          { params: { access_token: company.facebookPageAccessToken, fields: 'name' } }
        );
        pageName = pageDetailsResponse.data.name || pageName;
        console.log(`[IntegSvc getStatus] Nome da Página obtido: ${pageName}`);
      } catch (fbApiError) {
        console.error(
          `[IntegSvc getStatus] Falha ao buscar nome da Página ${company.facebookPageId} do Facebook. O token pode ter expirado ou sido revogado.`,
          fbApiError.response?.data?.error || fbApiError.message
        );
        // Não lança erro aqui, apenas retorna sem o nome atualizado ou com um aviso
      }

      return {
        isConnected: true,
        pageId: company.facebookPageId,
        pageName: pageName
      };
    } else {
      console.log(`[IntegSvc getStatus] Empresa ${companyId} não possui facebookPageId ou facebookPageAccessToken.`);
      return { isConnected: false };
    }
  } catch (error) {
    console.error(`[IntegSvc getStatus] Erro ao verificar status da integração FB para ${companyId}:`, error);
    throw new Error("Erro ao verificar status da integração com Facebook.");
  }
};

module.exports = {
  connectFacebookPageIntegration,
  getFacebookIntegrationStatus
};