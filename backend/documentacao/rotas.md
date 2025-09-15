# Rotas Express

Total: **72**

- **POST** `/google/callback` — _router_  
  • Middlewares: —  
  • Handlers: authController.googleCallback  
  • Arquivo: `routes/authRoutes.js`

- **POST** `/login` — _router_  
  • Middlewares: —  
  • Handlers: authController.loginUser  
  • Arquivo: `routes/authRoutes.js`

- **GET** `/` — _router_  
  • Middlewares: protect  
  • Handlers: brokerContactController.getAllBrokerContacts  
  • Arquivo: `routes/brokerContactRoutes.js`

- **POST** `/` — _router_  
  • Middlewares: protect  
  • Handlers: brokerContactController.createBrokerContact  
  • Arquivo: `routes/brokerContactRoutes.js`

- **GET** `/:id` — _router_  
  • Middlewares: protect  
  • Handlers: brokerContactController.getBrokerContactById  
  • Arquivo: `routes/brokerContactRoutes.js`

- **PUT** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: brokerContactController.updateBrokerContact  
  • Arquivo: `routes/brokerContactRoutes.js`

- **DELETE** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: brokerContactController.deleteBrokerContact  
  • Arquivo: `routes/brokerContactRoutes.js`

- **GET** `/conversations` — _router_  
  • Middlewares: —  
  • Handlers: listConversationsController  
  • Arquivo: `routes/chatRoutes.js`

- **GET** `/conversations/:conversationId/messages` — _router_  
  • Middlewares: —  
  • Handlers: getMessagesController  
  • Arquivo: `routes/chatRoutes.js`

- **POST** `/conversations/:conversationId/messages` — _router_  
  • Middlewares: —  
  • Handlers: sendMessageController  
  • Arquivo: `routes/chatRoutes.js`

- **POST** `/conversations/:conversationId/create-lead` — _router_  
  • Middlewares: —  
  • Handlers: createLeadFromConversationController  
  • Arquivo: `routes/chatRoutes.js`

- **POST** `/` — _router_  
  • Middlewares: —  
  • Handlers: CompanyController.createCompany  
  • Arquivo: `routes/companyRoutes.js`

- **GET** `/summary` — _router_  
  • Middlewares: protect  
  • Handlers: dashboardController.getSummary  
  • Arquivo: `routes/dashboardRoutes.js`

- **GET** `/financeiro` — _router_  
  • Middlewares: protect  
  • Handlers: dashboardController.getFinancialSummaryController  
  • Arquivo: `routes/dashboardRoutes.js`

- **GET** `/advanced-metrics` — _router_  
  • Middlewares: protect  
  • Handlers: dashboardController.getAdvancedMetricsController  
  • Arquivo: `routes/dashboardRoutes.js`

- **GET** `/financeiro-detalhado` — _router_  
  • Middlewares: protect  
  • Handlers: dashboardController.getDetailedFinancialSummaryController  
  • Arquivo: `routes/dashboardRoutes.js`

- **GET** `/` — _router_  
  • Middlewares: protect  
  • Handlers: discardReasonController.getAllDiscardReasonsByCompany  
  • Arquivo: `routes/discardReasonRoutes.js`

- **POST** `/` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: discardReasonController.createDiscardReason  
  • Arquivo: `routes/discardReasonRoutes.js`

- **PUT** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: discardReasonController.updateDiscardReason  
  • Arquivo: `routes/discardReasonRoutes.js`

- **DELETE** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: discardReasonController.deleteDiscardReason  
  • Arquivo: `routes/discardReasonRoutes.js`

- **GET** `/` — _router_  
  • Middlewares: —  
  • Handlers: FileController.listarArquivosController  
  • Arquivo: `routes/fileRoutes.js`

- **POST** `/upload` — _router_  
  • Middlewares: (expressão)  
  • Handlers: FileController.uploadArquivoController  
  • Arquivo: `routes/fileRoutes.js`

- **DELETE** `/:id` — _router_  
  • Middlewares: —  
  • Handlers: FileController.apagarArquivoController  
  • Arquivo: `routes/fileRoutes.js`

- **GET** `/:id/preview` — _router_  
  • Middlewares: —  
  • Handlers: FileController.previewArquivoController  
  • Arquivo: `routes/fileRoutes.js`

- **GET** `/dashboard` — _router_  
  • Middlewares: —  
  • Handlers: FinanceiroController.getDashboardController  
  • Arquivo: `routes/financeiroRoutes.js`

- **GET** `/parcelas` — _router_  
  • Middlewares: —  
  • Handlers: FinanceiroController.listarParcelasController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/parcelas/:id/baixa` — _router_  
  • Middlewares: —  
  • Handlers: FinanceiroController.registrarBaixaController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/parcelas/avulsa` — _router_  
  • Middlewares: authorize(...)  
  • Handlers: FinanceiroController.gerarParcelaAvulsaController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/contratos/:contratoId/gerar-plano` — _router_  
  • Middlewares: authorize(...)  
  • Handlers: FinanceiroController.gerarPlanoDePagamentosController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/despesas/:id/pagar` — _router_  
  • Middlewares: —  
  • Handlers: FinanceiroController.registrarPagamentoController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/indexadores/:id/valores` — _router_  
  • Middlewares: authorize(...)  
  • Handlers: FinanceiroController.upsertValorIndexadorController  
  • Arquivo: `routes/financeiroRoutes.js`

- **POST** `/facebook/connect-page` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.connectFacebookPage  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/facebook/status` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.getFacebookStatus  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/facebook/disconnect` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.disconnectFacebook  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/google/sync-contacts` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.syncGoogleContacts  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/google/list-contacts` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.listGoogleContactsController  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/google/import-selected-contacts` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.importSelectedGoogleContactsController  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/facebook/pages/:pageId/forms` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.listPageFormsController  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/facebook/pages/:pageId/linked-forms` — _router_  
  • Middlewares: protect  
  • Handlers: integrationController.saveLinkedFormsController  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/evolution/create-instance` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.createEvolutionInstanceController  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/evolution/instance/:instanceId/status` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.getEvolutionInstanceStatusController  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/evolution/instances` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.listEvolutionInstancesController  
  • Arquivo: `routes/integrationRoutes.js`

- **PUT** `/evolution/instance/:instanceId/settings` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.updateInstanceSettingsController  
  • Arquivo: `routes/integrationRoutes.js`

- **DELETE** `/evolution/instance/:instanceId` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.deleteEvolutionInstanceController  
  • Arquivo: `routes/integrationRoutes.js`

- **GET** `/evolution/instance/:instanceName/qrcode` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: integrationController.getQrCodeFromCacheController  
  • Arquivo: `routes/integrationRoutes.js`

- **POST** `/public/lead-requests` — _router_  
  • Middlewares: —  
  • Handlers: ctrl.createPublic  
  • Arquivo: `routes/leadRequestRoutes.js`

- **GET** `/lead-requests` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: ctrl.listAdmin  
  • Arquivo: `routes/leadRequestRoutes.js`

- **POST** `/lead-requests/:id/approve` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: ctrl.approve  
  • Arquivo: `routes/leadRequestRoutes.js`

- **POST** `/lead-requests/:id/reject` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: ctrl.reject  
  • Arquivo: `routes/leadRequestRoutes.js`

- **GET** `/csv-template` — _router_  
  • Middlewares: —  
  • Handlers: LeadController.downloadCSVTemplateController  
  • Arquivo: `routes/leadRoutes.js`

- **POST** `/importar-csv` — _router_  
  • Middlewares: protect, authorize(...), (expressão)  
  • Handlers: LeadController.importLeadsFromCSVController  
  • Arquivo: `routes/leadRoutes.js`

- **GET** `/:id/history` — _router_  
  • Middlewares: —  
  • Handlers: LeadController.getLeadHistory  
  • Arquivo: `routes/leadRoutes.js`

- **PUT** `/descartar/:id` — _router_  
  • Middlewares: —  
  • Handlers: LeadController.descartarLead  
  • Arquivo: `routes/leadRoutes.js`

- **GET** `/` — _router_  
  • Middlewares: protect  
  • Handlers: origemController.getOrigens  
  • Arquivo: `routes/OrigemRoutes.js`

- **POST** `/` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: origemController.createOrigem  
  • Arquivo: `routes/OrigemRoutes.js`

- **PUT** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: origemController.updateOrigem  
  • Arquivo: `routes/OrigemRoutes.js`

- **DELETE** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: origemController.deleteOrigem  
  • Arquivo: `routes/OrigemRoutes.js`

- **POST** `/ensure` — _router_  
  • Middlewares: —  
  • Handlers: origemController.ensureOrigem  
  • Arquivo: `routes/OrigemRoutes.js`

- **GET** `/:id/gerar-e-salvar-pdf` — _router_  
  • Middlewares: —  
  • Handlers: gerarEsalvarPdfController  
  • Arquivo: `routes/propostaContratoRoutes.js`

- **POST** `/broker/check` — _router_  
  • Middlewares: —  
  • Handlers: PublicController.checkBrokerController  
  • Arquivo: `routes/publicRoutes.js`

- **POST** `/submit-lead/:brokerToken` — _router_  
  • Middlewares: —  
  • Handlers: PublicController.submitLeadController  
  • Arquivo: `routes/publicRoutes.js`

- **POST** `/broker/register/:companyId` — _router_  
  • Middlewares: —  
  • Handlers: PublicController.registerBrokerController  
  • Arquivo: `routes/publicRoutes.js`

- **POST** `/contratos/:id/enviar` — _router_  
  • Middlewares: —  
  • Handlers: SignatureController.enviarContratoController  
  • Arquivo: `routes/signatureRoutes.js`

- **GET** `/` — _router_  
  • Middlewares: protect  
  • Handlers: UserController.getCompanyUsers  
  • Arquivo: `routes/userRoutes.js`

- **POST** `/` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: UserController.createUser  
  • Arquivo: `routes/userRoutes.js`

- **PUT** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: UserController.updateUser  
  • Arquivo: `routes/userRoutes.js`

- **GET** `/:id` — _router_  
  • Middlewares: protect  
  • Handlers: UserController.getUserById  
  • Arquivo: `routes/userRoutes.js`

- **DELETE** `/:id` — _router_  
  • Middlewares: protect, authorize(...)  
  • Handlers: UserController.deleteUser  
  • Arquivo: `routes/userRoutes.js`

- **POST** `/evolution` — _router_  
  • Middlewares: —  
  • Handlers: handleWebhook  
  • Arquivo: `routes/webhookRoutes.js`

- **GET** `/facebook/leads` — _router_  
  • Middlewares: —  
  • Handlers: webhookController.verifyFacebookWebhook  
  • Arquivo: `routes/webhookRoutes.js`

- **POST** `/facebook/leads` — _router_  
  • Middlewares: —  
  • Handlers: webhookController.handleFacebookLeadWebhook  
  • Arquivo: `routes/webhookRoutes.js`

- **POST** `/autentique` — _router_  
  • Middlewares: —  
  • Handlers: SignatureController.webhookAutentiqueController  
  • Arquivo: `routes/webhookRoutes.js`

