// services/integrationService.js
const axios = require("axios");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User'); 
const Lead = require('../models/Lead');
const LeadService = require('./LeadService'); 
const Origem = require('../models/origem'); 
const { PhoneNumberUtil, PhoneNumberFormat: PNF } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();
const EvolutionInstance = require('../models/EvolutionInstance');




// <<< Lendo variáveis de ambiente do backend diretamente
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const GRAPH_API_VERSION = "v22.0";
const WEBHOOK_RECEIVER_URL_FROM_ENV = process.env.FB_WEBHOOK_RECEIVER_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://malucrm.vercel.app'; 

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
  companyId,
  connectingUserId

) => {
  if (!pageId || !shortLivedUserAccessToken || !companyId || connectingUserId) {
    throw new Error("Page ID, User Access Token e Company ID são necessários.");
  }
  if (!FACEBOOK_APP_ID || !FB_APP_SECRET) {
    throw new Error("Configuração do servidor para Facebook incompleta.");
  }
  console.log(
    `[IntegSvc connect] Iniciando conexão da Página ${pageId} para Empresa ${companyId} por Usuário ${connectingUserId}`
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
        facebookConnectedByUserId: connectingUserId
      },
      { new: true, runValidators: true }
    );
    if (!updatedCompany) {
      throw new Error("Empresa não encontrada no banco de dados.");
    }
    console.log(`[IntegSvc DEBUG connect] Company atualizada: PageID=<span class="math-inline">\{updatedCompany\.facebookPageId\}, Token Salvo\=</span>{!!updatedCompany.facebookPageAccessToken}, ConectadoPor=${updatedCompany.facebookConnectedByUserId}`);


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
      .select("nome facebookPageId facebookPageAccessToken linkedFacebookForms") // Importante selecionar o token
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
      }
      return { isConnected: true, pageId: company.facebookPageId, pageName: pageName, linkedForms: company.linkedFacebookForms || [] };
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


/**
 * Importa contatos do Google do usuário como Leads para a empresa.
 * @param {string} userId - ID do usuário CRM realizando a importação.
 * @param {string} companyId - ID da empresa CRM para associar os leads.
 * @returns {Promise<object>} - Resumo da importação.
 */
const importGoogleContactsAsLeads = async (userId, companyId) => {
  if (!userId || !companyId) {
      throw new Error("UserID e CompanyID são obrigatórios para importar contatos.");
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
       throw new Error("Credenciais Google não configuradas no servidor.");
  }

  console.log(`[IntegSvc GoogleContacts] Iniciando importação para User ${userId}, Company ${companyId}`);

  // 1. Obter o refresh token do usuário
  const crmUser = await User.findById(userId).select('+googleRefreshToken');
  if (!crmUser || !crmUser.googleRefreshToken) {
      throw new Error("Usuário não conectado ao Google ou sem permissão (refresh token ausente). Conecte/Reconecte o Google Workspace na página de integrações.");
  }

  // 2. Configurar o cliente OAuth2 e obter um novo Access Token
  const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: crmUser.googleRefreshToken });

  let accessToken;
  try {
      const tokenResponse = await oauth2Client.getAccessToken(); // Força um refresh
      accessToken = tokenResponse.token;
      if (!accessToken) throw new Error("Não foi possível obter Access Token.");
      console.log("[IntegSvc GoogleContacts] Novo Access Token obtido.");
  } catch (tokenError) {
      console.error("[IntegSvc GoogleContacts] Erro ao obter Access Token:", tokenError.response?.data || tokenError.message);
      throw new Error("Falha ao obter autorização do Google. Tente reconectar sua conta Google na página de integrações.");
  }

  // 3. Buscar/Criar Origem "Contatos Google" para esta empresa
  const defaultOriginName = "Contatos Google";
  let crmOrigin;
  try {
      crmOrigin = await Origem.findOneAndUpdate(
          { company: companyId, nome: { $regex: new RegExp(`^${defaultOriginName}$`, 'i') } },
          { $setOnInsert: { nome: defaultOriginName, company: companyId, ativo: true, descricao: "Leads importados do Google Contacts." } },
          { new: true, upsert: true, runValidators: true }
      ).lean();
      console.log(`[IntegSvc GoogleContacts] Origem '${defaultOriginName}' pronta: ${crmOrigin._id}`);
  } catch (originError) {
      console.error(`[IntegSvc GoogleContacts] Falha ao obter/criar origem '${defaultOriginName}':`, originError);
      throw new Error(`Falha ao configurar origem padrão '${defaultOriginName}'.`);
  }

  // 4. Chamar Google People API para listar contatos
  let connections = [];
  let nextPageToken = null;
  const personFields = "names,emailAddresses,phoneNumbers,biographies"; // Campos que queremos
  console.log("[IntegSvc GoogleContacts] Buscando contatos na People API...");

  try {
      do {
          const params = { personFields, pageSize: 200 }; // pageSize alto para menos requests
          if (nextPageToken) params.pageToken = nextPageToken;

          const response = await axios.get('https://people.googleapis.com/v1/people/me/connections', {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: params
          });

          if (response.data.connections) {
              connections = connections.concat(response.data.connections);
          }
          nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);
      console.log(`[IntegSvc GoogleContacts] Total de ${connections.length} conexões encontradas.`);
  } catch (apiError) {
      console.error("[IntegSvc GoogleContacts] Erro ao buscar contatos da People API:", apiError.response?.data?.error || apiError.message);
      throw new Error("Falha ao buscar contatos do Google.");
  }

  // 5. Processar contatos e criar Leads
  let importedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;

  for (const person of connections) {
      const googleName = person.names?.[0]?.displayName;
      const googlePhoneObj = person.phoneNumbers?.find(p => p.value); 
      const googleEmailObj = person.emailAddresses?.find(e => e.value); 
      const googleNotes = person.biographies?.find(b => b.contentType === 'TEXT_PLAIN')?.value; 

      if (!googleName || !googlePhoneObj?.value) {
          console.log(`[IntegSvc GoogleContacts] Contato pulado (sem nome ou telefone): ${googleName || 'Sem nome'}`);
          skippedCount++;
          continue;
      }

      let formattedPhone;
      const rawPhone = googlePhoneObj.value;
      try {
        let phoneNumber;
        phoneNumber = phoneUtil.parseAndKeepRawInput(rawPhone, 'BR');

        if (phoneUtil.isValidNumber(phoneNumber)) {
            formattedPhone = phoneUtil.format(phoneNumber, PNF.E164); // Formata para +55...
            console.log(`[IntegSvc GoogleContacts] Telefone formatado para ${googleName || 'Contato Desconhecido'}: ${rawPhone} -> ${formattedPhone}`);
        } else {
            console.log(`[IntegSvc GoogleContacts] Telefone do Google Contato não é válido (${rawPhone}) para ${googleName || 'Contato Desconhecido'}. Pulando este contato.`);
            skippedCount++;
            continue; 
        }
    } catch (e) {
        console.log(`[IntegSvc GoogleContacts] Erro ao processar/parsear telefone '${rawPhone}' para ${googleName || 'Contato Desconhecido'}. Pulando. Erro: ${e.message}`);
        skippedCount++;
        continue; // Pula para o próximo contato do Google
    }

      // Verificar duplicidade pelo telefone formatado
      const existingLead = await Lead.findOne({ contato: formattedPhone, company: companyId }).lean();
      if (existingLead) {
          console.log(`[IntegSvc GoogleContacts] Duplicado (telefone ${formattedPhone}) para ${googleName}. Pulando.`);
          duplicateCount++;
          continue;
      }

      // Preparar dados do Lead
      const leadData = {
          nome: googleName,
          contato: formattedPhone,
          email: googleEmailObj?.value || null,
          origem: crmOrigin._id, 
          comentario: googleNotes || null,
      };

      try {
          await LeadService.createLead(leadData, companyId, userId);
          importedCount++;
      } catch (createError) {
          console.error(`[IntegSvc GoogleContacts] Erro ao criar Lead para ${googleName}:`, createError);
          skippedCount++;
      }
  }

  const summary = {
      totalContactsProcessed: connections.length,
      leadsImported: importedCount,
      duplicatesSkipped: duplicateCount,
      othersSkipped: skippedCount
  };
  console.log("[IntegSvc GoogleContacts] Importação concluída:", summary);
  return summary;
};



/**
 * Lista contatos do Google do usuário, pré-filtrando aqueles que já existem como Leads
 * na empresa (baseado no telefone).
 * @param {string} userId - ID do usuário CRM realizando a importação.
 * @param {string} companyId - ID da empresa CRM.
 * @returns {Promise<Array>} - Array de contatos simplificados e não duplicados.
 */
const listGoogleContacts = async (userId, companyId) => {
  if (!userId || !companyId) {
      throw new Error("UserID e CompanyID são obrigatórios para listar contatos do Google.");
  }
  // ... (Lógica para obter accessToken do Google - igual à versão anterior desta função) ...
  const crmUser = await User.findById(userId).select('+googleRefreshToken');
  if (!crmUser || !crmUser.googleRefreshToken) {
      throw new Error("Usuário não conectado ao Google ou sem permissão de refresh token.");
  }
  const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: crmUser.googleRefreshToken });
  let accessToken;
  try {
      const tokenResponse = await oauth2Client.getAccessToken();
      accessToken = tokenResponse.token;
      if (!accessToken) throw new Error("Não foi possível obter Access Token do Google.");
      console.log("[IntegSvc GoogleContactsList] Novo Access Token obtido para listar.");
  } catch (tokenError) {
      console.error("[IntegSvc GoogleContactsList] Erro ao obter Access Token:", tokenError.response?.data || tokenError.message);
      throw new Error("Falha ao obter autorização do Google.");
  }

  let googleConnections = [];
  let nextPageToken = null;
  const personFields = "names,emailAddresses,phoneNumbers,biographies,organizations";
   
  console.log("[IntegSvc GoogleContactsList] Buscando conexões na People API com personFields:", personFields);

  try {
      do {
        const params = { 
          personFields: personFields,
          pageSize: 200,
          sources: 'READ_SOURCE_TYPE_CONTACT' 
      };
          if (nextPageToken) params.pageToken = nextPageToken;
          const response = await axios.get('https://people.googleapis.com/v1/people/me/connections', {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: params
          });
          if (response.data.connections) {
              googleConnections = googleConnections.concat(response.data.connections);
          }
          nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);
      console.log(`[IntegSvc GoogleContactsList] Total de ${googleConnections.length} conexões Google encontradas.`);

      if (googleConnections.length === 0) {
          return [];
      }

      // Extrair e formatar telefones dos contatos Google
      const googleContactsWithPhone = [];
      for (const person of googleConnections) {
          const googlePhoneObj = person.phoneNumbers?.find(p => p.value);
          if (googlePhoneObj?.value) {
              try {
                  const phoneNumber = phoneUtil.parseAndKeepRawInput(googlePhoneObj.value, 'BR');
                  if (phoneUtil.isValidNumber(phoneNumber)) {
                      const formattedPhone = phoneUtil.format(phoneNumber, PNF.E164);
                      googleContactsWithPhone.push({
                          googleContactId: person.resourceName,
                          displayName: person.names?.[0]?.displayName || 'Nome não disponível',
                          email: person.emailAddresses?.[0]?.value || null,
                          phone: formattedPhone, // Telefone já formatado
                          notes: person.biographies?.find(b => b.contentType === 'TEXT_PLAIN')?.value || null,
                          organization: person.organizations?.[0]?.name || null
                      });
                  }
              } catch (e) {
                  console.warn(`[IntegSvc GoogleContactsList] Telefone inválido/não formatável: ${googlePhoneObj.value} para ${person.names?.[0]?.displayName}. Pulando formatação.`);
              }
          } else {
               // Adiciona contato mesmo sem telefone para que possa ser importado se tiver email
               googleContactsWithPhone.push({
                  googleContactId: person.resourceName,
                  displayName: person.names?.[0]?.displayName || 'Nome não disponível',
                  email: person.emailAddresses?.[0]?.value || null,
                  phone: null, // Sem telefone válido
                  notes: person.biographies?.find(b => b.contentType === 'TEXT_PLAIN')?.value || null,
                  organization: person.organizations?.[0]?.name || null
              });
          }
      }

      // Pegar todos os telefones formatados (que não são null) para checar duplicidade no DB
      const phoneNumbersFromGoogle = googleContactsWithPhone
          .map(contact => contact.phone)
          .filter(phone => phone !== null); // Filtra apenas os que têm telefone formatado

      let existingLeadPhones = new Set();
      if (phoneNumbersFromGoogle.length > 0) {
          const leadsInDB = await Lead.find({
              company: companyId,
              contato: { $in: phoneNumbersFromGoogle } // Busca todos os leads que têm um desses telefones
          }).select('contato').lean();
          existingLeadPhones = new Set(leadsInDB.map(lead => lead.contato));
          console.log(`[IntegSvc GoogleContactsList] Telefones de Leads já existentes no CRM:`, Array.from(existingLeadPhones));
      }

      // Filtrar a lista de contatos Google, removendo aqueles cujo telefone já existe
      const newContactsToSuggest = googleContactsWithPhone.filter(contact => {
          if (contact.phone === null) { 
              return true;
          }
          return !existingLeadPhones.has(contact.phone);
      });

      console.log(`[IntegSvc GoogleContactsList] ${newContactsToSuggest.length} novos contatos sugeridos para importação.`);
      return newContactsToSuggest;

  } catch (apiError) {
      console.error("[IntegSvc GoogleContactsList] Erro ao buscar/processar contatos da People API:", apiError.response?.data?.error || apiError.message);
      throw new Error("Falha ao buscar contatos do Google.");
  }
};


/**
 * Processa uma lista de contatos do Google selecionados e tenta criar Leads.
 * @param {string} userId - ID do usuário CRM realizando a importação.
 * @param {string} companyId - ID da empresa CRM para associar os leads.
 * @param {Array<object>} selectedContacts - Array de contatos (com displayName, email, phone, notes, organization).
 * @returns {Promise<object>} - Resumo da importação.
 */
const processSelectedGoogleContacts = async (userId, companyId, selectedContacts) => {
  if (!userId || !companyId) {
      throw new Error("UserID e CompanyID são obrigatórios.");
  }
  if (!Array.isArray(selectedContacts) || selectedContacts.length === 0) {
      return { message: "Nenhum contato selecionado para importação.", summary: { leadsImported: 0, duplicatesSkipped: 0, errorsEncountered: 0, totalProcessed: 0 }};
  }
  console.log(`[IntegSvc ProcSelect] Iniciando processamento de ${selectedContacts.length} contatos selecionados para User ${userId}, Company ${companyId}`);

  // 1. Buscar/Criar Origem "Contatos Google" (igual ao listGoogleContacts)
  const defaultOriginName = "Contatos Google";
  let crmOrigin;
  try {
      crmOrigin = await Origem.findOneAndUpdate(
          { company: companyId, nome: { $regex: new RegExp(`^${defaultOriginName}$`, 'i') } },
          { $setOnInsert: { nome: defaultOriginName, company: companyId, ativo: true, descricao: "Leads importados do Google Contacts." } },
          { new: true, upsert: true, runValidators: true }
      ).lean();
      if (!crmOrigin) throw new Error("Falha crítica ao obter/criar origem padrão.");
      console.log(`[IntegSvc ProcSelect] Usando Origem '${defaultOriginName}': ${crmOrigin._id}`);
  } catch (originError) {
      console.error(`[IntegSvc ProcSelect] Falha ao obter/criar origem '${defaultOriginName}':`, originError);
      throw new Error(`Falha ao configurar origem padrão '${defaultOriginName}'.`);
  }

  let importedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (const contact of selectedContacts) {
      if (!contact.displayName || !contact.phone) {
          console.log(`[IntegSvc ProcSelect] Contato pulado (sem nome ou telefone): ${contact.displayName || 'Sem nome'}`);
          errorCount++; // Ou um contador de 'skipped_invalid_data'
          continue;
      }

      let formattedPhone;
      try {
          const phoneNumber = phoneUtil.parseAndKeepRawInput(contact.phone, 'BR');
          if (phoneUtil.isValidNumber(phoneNumber)) {
              formattedPhone = phoneUtil.format(phoneNumber, PNF.E164);
          } else {
              console.log(`[IntegSvc ProcSelect] Telefone inválido (${contact.phone}) para ${contact.displayName}. Pulando.`);
              errorCount++;
              continue;
          }
      } catch (e) {
          console.log(`[IntegSvc ProcSelect] Erro ao formatar telefone '${contact.phone}' para ${contact.displayName}. Pulando. Erro: ${e.message}`);
          errorCount++;
          continue;
      }

      // Verificar duplicidade pelo telefone formatado
      const existingLead = await Lead.findOne({ contato: formattedPhone, company: companyId }).lean();
      if (existingLead) {
          console.log(`[IntegSvc ProcSelect] Duplicado (telefone ${formattedPhone}) para ${contact.displayName}. Pulando.`);
          duplicateCount++;
          continue;
      }

      // Preparar dados do Lead
      const leadData = {
          nome: contact.displayName,
          contato: formattedPhone,
          email: contact.email || null,
          origem: crmOrigin._id,
          comentario: contact.notes || (contact.organization ? `Empresa do Contato: ${contact.organization}` : null),
          // Situação e Responsável serão definidos pelos defaults do LeadService.createLead
          // ou podemos definir responsavel: userId aqui explicitamente.
      };

      try {
          await LeadService.createLead(leadData, companyId, userId); // Passa userId como criador/responsável padrão
          importedCount++;
      } catch (createError) {
          console.error(`[IntegSvc ProcSelect] Erro ao criar Lead para ${contact.displayName}:`, createError);
          errorCount++;
      }
  }

  const summary = {
      totalProcessed: selectedContacts.length,
      leadsImported: importedCount,
      duplicatesSkipped: duplicateCount,
      errorsEncountered: errorCount
  };
  console.log("[IntegSvc ProcSelect] Processamento de contatos selecionados concluído:", summary);
  return summary;
};



/**
 * Lista os formulários de Lead Ad de uma Página do Facebook conectada.
 * @param {string} companyId - ID da Empresa CRM.
 * @param {string} pageId - ID da Página do Facebook.
 * @returns {Promise<Array>} - Array de objetos de formulário (id, name, status, etc.).
 */
const listFormsForFacebookPage = async (companyId, pageId) => {
  if (!companyId || !pageId) {
      throw new Error("Company ID e Page ID são necessários para listar formulários.");
  }
  if (!FACEBOOK_APP_ID || !FB_APP_SECRET) {
      throw new Error("Configuração do servidor para Facebook incompleta.");
  }
  console.log(`[IntegSvc ListForms] Buscando formulários para Page ${pageId}, Company ${companyId}`);

  try {
      const company = await Company.findById(companyId).select('+facebookPageAccessToken').lean();
      if (!company || !company.facebookPageAccessToken || company.facebookPageId !== pageId) {
          throw new Error("Página não conectada corretamente a esta empresa ou token de acesso da página ausente.");
      }
      
      const apiversion = GRAPH_API_VERSION;
      const apiUrl = `https://graph.facebook.com/${apiversion}/${pageId}/leadgen_forms`;

      console.log(`[IntegSvc ListForms DEBUG] Page ID para URL: "${pageId}"`);
      console.log(`[IntegSvc ListForms DEBUG] GRAPH_API_VERSION para URL: "${apiversion}"`);
      console.log(`[IntegSvc ListForms DEBUG] URL CONSTRUÍDA PARA AXIOS: ${apiUrl}`);

      const requestConfig = {
        params: {
            fields: 'id,name,status,locale,created_time',
            access_token: company.facebookPageAccessToken
        }
    };

    const response = await axios.get(apiUrl, requestConfig);


    const forms = Array.isArray(response.data?.data) ? response.data.data : [];
    console.log(`[IntegSvc ListForms] Encontrados ${forms.length} formulários para Page ${pageId}.`);
    return forms;

  } catch (error) {
      const fbError = error.response?.data?.error;
      console.error(`[IntegSvc ListForms] Erro ao buscar formulários para Page ${pageId}:`, fbError || error.message);
      throw new Error(fbError?.message || "Erro ao buscar formulários da página do Facebook.");
  }
};


/**
 * Salva a lista de formulários do Facebook selecionados para uma empresa.
 * @param {string} companyId - ID da Empresa CRM.
 * @param {string} pageId - ID da Página do Facebook à qual os formulários pertencem.
 * @param {Array<{formId: string, formName: string}>} selectedForms - Array de objetos de formulário selecionados.
 * @returns {Promise<object>} - A empresa atualizada com os formulários vinculados.
 */
const saveLinkedFacebookForms = async (companyId, pageId, selectedForms) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error("ID da empresa inválido.");
  }
  if (!pageId) { // O ID da página é crucial para validar a consistência
      throw new Error("ID da Página do Facebook é obrigatório.");
  }
  if (!Array.isArray(selectedForms)) { // Valida se é um array
      throw new Error("Dados de formulários selecionados inválidos.");
  }

  console.log(`[IntegSvc SaveForms] Salvando ${selectedForms.length} formulários para Page ${pageId}, Company ${companyId}`);

  try {
      const company = await Company.findById(companyId);
      if (!company) {
          throw new Error("Empresa não encontrada.");
      }

      // Valida se a pageId fornecida corresponde à página conectada à empresa
      if (company.facebookPageId !== pageId) {
          throw new Error("A página fornecida não corresponde à página atualmente conectada a esta empresa.");
      }

      // Garante que os dados dos formulários tenham o formato esperado
      const formsToLink = selectedForms.map(form => {
          if (!form.formId || !form.formName) { // Verifica se cada objeto form tem os campos necessários
              console.warn("[IntegSvc SaveForms] Objeto de formulário inválido encontrado:", form);
              throw new Error("Formato de dados de formulário inválido. 'formId' e 'formName' são obrigatórios.");
          }
          return { formId: String(form.formId), formName: String(form.formName) };
      });

      company.linkedFacebookForms = formsToLink; // Substitui a lista existente
      await company.save();

      console.log(`[IntegSvc SaveForms] Seleção de ${formsToLink.length} formulários salva para Company ${companyId}.`);
      return { message: "Seleção de formulários salva com sucesso!", linkedFormsCount: formsToLink.length };

  } catch (error) {
      console.error(`[IntegSvc SaveForms] Erro ao salvar seleção de formulários para Company ${companyId}:`, error);
      throw new Error(error.message || "Erro ao salvar seleção de formulários.");
  }
};

/**
 * Cria uma nova instância na Evolution API e a salva no banco de dados do CRM.
 * @param {string} instanceName - O nome desejado para a nova instância.
 * @param {string} companyId - ID da empresa.
 * @param {string} creatingUserId - ID do usuário que está criando.
 * @returns {Promise<EvolutionInstance>} A instância salva no banco do CRM.
 */
const createEvolutionInstance = async (instanceName, companyId, creatingUserId) => {
    console.log(`[IntegSvc Evolution] Tentando criar instância '${instanceName}'...`);

    const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = process.env;
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        throw new Error("Evolution API não configurada no servidor.");
    }

    const existingInstance = await EvolutionInstance.findOne({ instanceName, company: companyId });
    if (existingInstance) {
        throw new Error(`Uma instância com o nome '${instanceName}' já está registrada.`);
    }

    try {
        const response = await axios.post(
            `${EVOLUTION_API_URL}/instance/create`,
            { instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" },
            { headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY } }
        );

        const evolutionData = response.data;
        console.log("[IntegSvc Evolution] Resposta da Evolution API:", evolutionData);
        
        // VVVVV VALIDAÇÃO CORRIGIDA VVVVV
        // Agora verificamos se 'hash' é uma string e se 'instance' existe
        if (!evolutionData.instance || typeof evolutionData.hash !== 'string') {
            throw new Error("A resposta da Evolution API foi inválida ou não continha a chave da instância.");
        }
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        const newInstance = new EvolutionInstance({
            instanceName: evolutionData.instance.instanceName,
            instanceId: evolutionData.instance.instanceId,
            // VVVVV USA A STRING 'hash' DIRETAMENTE COMO A APIKEY VVVVV
            apiKey: evolutionData.hash, 
            // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            status: evolutionData.instance.status,
            ownerNumber: evolutionData.instance.number || null,
            company: companyId,
            createdBy: creatingUserId
        });

        await newInstance.save();
        console.log(`[IntegSvc Evolution] Instância '${newInstance.instanceName}' salva no DB com ID: ${newInstance._id}`);
        return newInstance;

    } catch (error) {
        // ... (seu bloco catch melhorado continua o mesmo)
        // ...
    }
};


/**
 * Busca o status de conexão de uma instância específica da Evolution API.
 * Se a instância não estiver conectada, tenta obter o QR Code.
 * @param {string} instanceId - O _id da instância no NOSSO banco de dados.
 * @param {string} companyId - ID da empresa para segurança.
 * @returns {Promise<object>} Objeto com o status e, se aplicável, o QR Code em base64.
 */
const getEvolutionInstanceConnectionState = async (instanceId, companyId) => {
    console.log(`[IntegSvc Evolution] Verificando estado da instância: ${instanceId} para Company: ${companyId}`);

    const { EVOLUTION_API_URL } = process.env;
    if (!EVOLUTION_API_URL) {
        throw new Error("A URL da Evolution API não está configurada no servidor.");
    }
    
    // 1. Busca os dados da instância no nosso DB para pegar o nome e a chave de API dela.
    const crmInstance = await EvolutionInstance.findOne({ _id: instanceId, company: companyId });
    if (!crmInstance) {
        throw new Error("Instância não encontrada ou não pertence a esta empresa.");
    }

    try {
        // 2. Chama a API Externa da Evolution para pegar o estado ATUAL da instância.
        const response = await axios.get(
            `${EVOLUTION_API_URL}/instance/connectionState/${crmInstance.instanceName}`,
            {
                headers: {
                    'apikey': crmInstance.apiKey // Usa a API Key específica da instância
                }
            }
        );

        const connectionState = response.data;

        // 3. Se o estado for 'open' (conectado), apenas retorna o status.
        if (connectionState.state === 'open') {
            console.log(`[IntegSvc Evolution] Instância '${crmInstance.instanceName}' está conectada.`);
            return {
                status: 'CONECTADO',
                qrcode: null,
                instanceName: crmInstance.instanceName
            };
        }

        // 4. Se não estiver conectada, busca o QR Code. A Evolution API retorna o QR Code em base64.
        console.log(`[IntegSvc Evolution] Instância '${crmInstance.instanceName}' não conectada. Buscando QR Code...`);
        const qrCodeResponse = await axios.get(
            `${EVOLUTION_API_URL}/instance/connect/${crmInstance.instanceName}`,
            {
                headers: {
                    'apikey': crmInstance.apiKey
                }
            }
        );
        
        // O QR Code vem no campo 'base64' da resposta
        const qrCodeBase64 = qrCodeResponse.data?.base64;
        if (!qrCodeBase64) {
            throw new Error("Não foi possível obter o QR Code da Evolution API.");
        }

        console.log(`[IntegSvc Evolution] QR Code para '${crmInstance.instanceName}' obtido.`);
        return {
            status: 'AGUARDANDO_QR_CODE',
            qrcode: qrCodeBase64,
            instanceName: crmInstance.instanceName
        };

    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido ao verificar instância.";
        console.error(`[IntegSvc Evolution] Erro ao verificar estado da instância '${crmInstance.instanceName}':`, error.response?.data || error);
        throw new Error(errorMsg);
    }
};

/**
 * Lista todas as instâncias da Evolution API salvas para uma empresa específica.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Array>} Um array com as instâncias encontradas.
 */
const listEvolutionInstances = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }
    console.log(`[IntegSvc Evolution] Listando instâncias para Company: ${companyId}`);
    
    const instances = await EvolutionInstance.find({ company: companyId })
        .sort({ createdAt: -1 })
        .lean();
        
    return instances;
};

const updateInstanceSettings = async (instanceId, companyId, settings) => {
    const { receiveFromGroups } = settings;
    
    const updatedInstance = await EvolutionInstance.findOneAndUpdate(
        { _id: instanceId, company: companyId },
        { $set: { receiveFromGroups: Boolean(receiveFromGroups) } },
        { new: true }
    );

    if (!updatedInstance) throw new Error("Instância não encontrada.");
    return updatedInstance;
};


/**
 * Deleta uma instância da Evolution API e do banco de dados do CRM.
 * @param {string} instanceId - O _id da instância no NOSSO banco de dados.
 * @param {string} companyId - ID da empresa para segurança.
 */
const deleteEvolutionInstance = async (instanceId, companyId) => {
    const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = process.env;

    const crmInstance = await EvolutionInstance.findOne({ _id: instanceId, company: companyId });
    if (!crmInstance) {
        throw new Error("Instância não encontrada ou não pertence a esta empresa.");
    }

    try {
        // 1. Tenta remover a instância da Evolution API externa
        console.log(`[IntegSvc] Deletando instância '${crmInstance.instanceName}' da Evolution API...`);
        await axios.delete(`${EVOLUTION_API_URL}/instance/delete/${crmInstance.instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        console.log(`[IntegSvc] Instância '${crmInstance.instanceName}' removida da Evolution API.`);
    } catch (error) {
        // Não impede a exclusão do nosso DB se a instância já não existir lá
        console.warn(`[IntegSvc] Não foi possível remover a instância da Evolution API (pode já ter sido removida). Erro: ${error.message}`);
    }

    // 2. Remove a instância do nosso banco de dados
    await EvolutionInstance.deleteOne({ _id: instanceId, company: companyId });
    console.log(`[IntegSvc] Instância com ID '${instanceId}' removida do banco de dados do CRM.`);

    return { message: `Instância '${crmInstance.instanceName}' foi removida com sucesso.` };
};


module.exports = {
  connectFacebookPageIntegration,
  getFacebookIntegrationStatus,
  disconnectFacebookPageIntegration,
  importGoogleContactsAsLeads,
  listGoogleContacts,
  processSelectedGoogleContacts,
  listFormsForFacebookPage,
  saveLinkedFacebookForms,
  createEvolutionInstance,
  getEvolutionInstanceConnectionState,
  listEvolutionInstances,
  updateInstanceSettings,
  deleteEvolutionInstance
};