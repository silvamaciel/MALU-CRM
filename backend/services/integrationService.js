// services/integrationService.js
const axios = require("axios");
const Company = require("../models/Company");
const mongoose = require("mongoose");
// const crypto = require("crypto"); // Removido pois não estamos mais gerando tokens de webhook por empresa aqui

// <<< Lendo variáveis de ambiente do backend diretamente
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const GRAPH_API_VERSION = "v22.0";
const WEBHOOK_RECEIVER_URL_FROM_ENV = process.env.FB_WEBHOOK_RECEIVER_URL;

// Verificações de inicialização
if (!FACEBOOK_APP_ID || !FB_APP_SECRET) {
  console.error(
    "ERRO FATAL DE CONFIGURAÇÃO: FACEBOOK_APP_ID ou FB_APP_SECRET não estão definidos nas variáveis de ambiente do backend!"
  );
  throw new Error("Configuração crítica do Facebook faltando no servidor.");
}
if (!WEBHOOK_RECEIVER_URL_FROM_ENV && process.env.NODE_ENV !== "development") {
  console.warn(
    "AVISO DE CONFIGURAÇÃO: FB_WEBHOOK_RECEIVER_URL não definida no .env do backend!"
  );
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
  if (!FACEBOOK_APP_ID || !FB_APP_SECRET) {
    throw new Error("Configuração do servidor para Facebook incompleta.");
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
          client_id: FACEBOOK_APP_ID, // Usa a variável correta
          client_secret: FB_APP_SECRET,
          fb_exchange_token: shortLivedUserAccessToken,
        },
      }
    );
    const longLivedUserAccessToken = longLivedUserTokenResponse.data.access_token;
    if (!longLivedUserAccessToken) {
      console.error("[IntegSvc connect] Falha ao obter Long-Lived User Token. Resposta FB:", longLivedUserTokenResponse.data);
      throw new Error("Falha ao obter Long-Lived User Token do Facebook.");
    }
    console.log("[IntegSvc connect] Long-Lived User Token obtido.");

    // 2. Obter o token de acesso da PÁGINA de longa duração
    console.log(`[IntegSvc connect] Obtendo Long-Lived Page Token para Página ${pageId}...`);
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
    if (!longLivedPageAccessToken) {
      console.error("[IntegSvc connect] Falha ao obter Long-Lived Page Token. Resposta FB:", pageTokenResponse.data);
      throw new Error("Falha ao obter Long-Lived Page Token do Facebook.");
    }
    console.log(`[IntegSvc connect] Long-Lived Page Token obtido para ${pageId}. (Início: ${String(longLivedPageAccessToken).substring(0,15)}...)`);


    // 3. Salvar Page ID e Page Access Token na Company
    console.log(`[IntegSvc connect] Atualizando Company ${companyId} com dados do FB...`);
    const existingCompanyWithPage = await Company.findOne({
      facebookPageId: pageId,
      _id: { $ne: companyId },
    });
    if (existingCompanyWithPage) {
      throw new Error(
        `A Página do Facebook ID ${pageId} já está conectada à empresa ${existingCompanyWithPage.nome}.`
      );
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        facebookPageId: pageId,
        facebookPageAccessToken: longLivedPageAccessToken,
      },
      { new: true, runValidators: true } // Adicionado runValidators
    );
    if (!updatedCompany) {
      throw new Error("Empresa não encontrada no banco de dados.");
    }
    console.log(`[IntegSvc DEBUG connect] Company atualizada: PageID=${updatedCompany.facebookPageId}, Token Salvo=${!!updatedCompany.facebookPageAccessToken}`);


    // 4. Inscrever a Página no Webhook de Leadgen do seu App Meta
    console.log(`[IntegSvc connect] Inscrevendo Página ${pageId} no webhook 'leadgen'...`);
    const subscribeResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`,
      null,
      { params: {
          subscribed_fields: "leadgen",
          access_token: longLivedPageAccessToken, // USA O TOKEN DA PÁGINA
        },
      }
    );
    const wasSuccessfulSubscription = subscribeResponse.data.success === true ||
                                (typeof subscribeResponse.data === 'string' && subscribeResponse.data.toLowerCase().includes("success"));
    if (!wasSuccessfulSubscription) {
      console.error("[IntegSvc connect] Falha ao inscrever webhook:", subscribeResponse.data);
      throw new Error("Falha ao configurar o recebimento de leads no Facebook.");
    }
    console.log(`[IntegSvc connect] Webhook 'leadgen' configurado com sucesso para Página ${pageId}!`);

    return { message: `Página ${pageId} conectada e configurada para receber leads!` };

  } catch (error) {
    const fbError = error.response?.data?.error;
    console.error("[IntegSvc connect] Erro durante conexão da página FB:", fbError || error);
    throw new Error(fbError?.message || error.message || "Erro desconhecido ao conectar página do Facebook.");
  }
};

/**
 * Verifica o status da integração com o Facebook para uma empresa.
 */
const getFacebookIntegrationStatus = async (companyId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da empresa inválido para verificar status.");
  }
  console.log(`[IntegSvc getStatus] Verificando status FB para Empresa ${companyId}`);
  try {
    const company = await Company.findById(companyId)
      .select("nome facebookPageId facebookPageAccessToken") // Importante selecionar o token
      .lean();

    console.log(`[IntegSvc DEBUG getStatus] Company do DB:`, company ? JSON.stringify({_id: company._id, nome: company.nome, fbPageId: company.facebookPageId, hasFbToken: !!company.facebookPageAccessToken}) : null);

    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    if (company.facebookPageId && company.facebookPageAccessToken) {
      let pageName = 'Nome da Página Indisponível';
      try {
        console.log(`[IntegSvc getStatus] Buscando nome para Page ID ${company.facebookPageId} usando token...`);
        const pageDetailsResponse = await axios.get(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${company.facebookPageId}`,
          { params: { access_token: company.facebookPageAccessToken, fields: 'name' } }
        );
        pageName = pageDetailsResponse.data.name || pageName;
        console.log(`[IntegSvc getStatus] Nome da Página obtido: ${pageName}`);
      } catch (fbApiError) {
        console.error(`[IntegSvc getStatus] Falha ao buscar nome da Página ${company.facebookPageId}. Token pode estar inválido/expirado.`, fbApiError.response?.data?.error || fbApiError.message);
        // Retorna que está "conectado" pelo ID, mas com aviso sobre o nome.
        // Ou poderia retornar isConnected: false se o token não funcionar mais para buscar nome.
        // Por enquanto, se o ID está lá, consideramos conectado.
      }
      return { isConnected: true, pageId: company.facebookPageId, pageName: pageName };
    } else {
      console.log(`[IntegSvc getStatus] Empresa ${companyId} não tem facebookPageId ou facebookPageAccessToken.`);
      return { isConnected: false };
    }
  } catch (error) {
    console.error(`[IntegSvc getStatus] Erro ao verificar status FB para ${companyId}:`, error);
    throw new Error("Erro ao verificar status da integração com Facebook.");
  }
};


/**
 * Desconecta uma Página do Facebook de uma empresa CRM:
 * - Desinscreve o app dos webhooks 'leadgen' para a página.
 * - Limpa os campos facebookPageId e facebookPageAccessToken da empresa.
 * @param {string} companyId - ID da Empresa CRM.
 * @returns {Promise<object>} - Mensagem de sucesso.
 */
const disconnectFacebookPageIntegration = async (companyId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error("ID da empresa inválido para desconectar página do Facebook.");
  }
  console.log(`[IntegSvc disconnect] Iniciando desconexão da página FB para Empresa ${companyId}`);

  try {
      // Passo 1: Buscar os dados da empresa com .lean() para obter o token e pageId
      // Usando a mesma lógica de select que funciona no getFacebookIntegrationStatus
      const companyDataForUnsubscribe = await Company.findById(companyId)
          .select('facebookPageId facebookPageAccessToken') // Seleciona o que precisamos para desinscrever
          .lean(); // <<< USA .lean() para esta leitura específica

      console.log("[IntegSvc disconnect] Dados da Company para desinscrever (lean):",
          companyDataForUnsubscribe ? JSON.stringify({
              _id: companyDataForUnsubscribe._id,
              fbPageId: companyDataForUnsubscribe.facebookPageId,
              hasToken: !!companyDataForUnsubscribe.facebookPageAccessToken
          }) : "Company não encontrada com lean()"
      );

      if (!companyDataForUnsubscribe || !companyDataForUnsubscribe.facebookPageId || !companyDataForUnsubscribe.facebookPageAccessToken) {
          console.log(`[IntegSvc disconnect] Empresa ${companyId} não tem dados de página FB ou token para desinscrever.`);
          // Se os campos já estão nulos no DB, podemos considerar a desconexão "bem-sucedida" em termos de estado do DB.
          // Ou forçar a limpeza para garantir, caso haja apenas um deles.
          // Vamos prosseguir para a limpeza no DB para garantir.
      }

      const pageIdToDisconnect = companyDataForUnsubscribe?.facebookPageId;
      const pageAccessToken = companyDataForUnsubscribe?.facebookPageAccessToken;

      // Passo 2: Tentar desinscrever a Página do Webhook se tivermos os dados
      if (pageIdToDisconnect && pageAccessToken) {
          try {
              console.log(`[IntegSvc disconnect] Desinscrevendo Página ${pageIdToDisconnect} do webhook leadgen...`);
              await axios.delete(
                  `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageIdToDisconnect}/subscribed_apps`,
                  { params: { access_token: pageAccessToken } }
              );
              console.log(`[IntegSvc disconnect] Webhook leadgen desinscrito com sucesso para Página ${pageIdToDisconnect}.`);
          } catch (unsubscribeError) {
              console.error(
                  `[IntegSvc disconnect] ALERTA: Falha ao desinscrever webhook para Página ${pageIdToDisconnect}. Pode precisar de remoção manual no Facebook. Erro:`,
                  unsubscribeError.response?.data?.error || unsubscribeError.message
              );
          }
      } else {
          console.log(`[IntegSvc disconnect] Não foi possível tentar desinscrever do Facebook (pageId ou pageAccessToken ausentes na leitura inicial).`);
      }

      // Passo 3: Limpar os campos no documento Company usando findByIdAndUpdate
      console.log(`[IntegSvc disconnect] Limpando dados da Página FB na Empresa ${companyId} via findByIdAndUpdate...`);
      const updatedCompany = await Company.findByIdAndUpdate(companyId, {
          $set: { // Usar $set para garantir que apenas estes campos sejam modificados para null
              facebookPageId: null,
              facebookPageAccessToken: null,
              facebookWebhookSubscriptionId: null,
          }
      }, { new: true });

      if (!updatedCompany) {
          throw new Error("Empresa não encontrada durante a tentativa de limpar dados do FB.");
      }

      console.log(`[IntegSvc disconnect] Dados da Página FB removidos da Empresa ${companyId} (verifique no DB).`);
      return { message: `Página do Facebook (ID: ${pageIdToDisconnect || 'N/A'}) desconectada e dados limpos no CRM.` };

  } catch (error) {
      console.error(`[IntegSvc disconnect] Erro durante desconexão da página FB para Empresa ${companyId}:`, error);
      throw new Error(error.message || "Erro ao desconectar página do Facebook.");
  }
};

module.exports = {
  connectFacebookPageIntegration,
  getFacebookIntegrationStatus,
  disconnectFacebookPageIntegration
};