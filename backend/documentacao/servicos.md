# Services

Services que importam **models** (candidatos a refator para PostgreSQL):

- `services/authService.js`
  • Models importados: ../models/User
- `services/brokerContactService.js`
  • Models importados: ../models/BrokerContact, ../models/Lead
- `services/ChatService.js`
  • Models importados: ../models/Conversation, ../models/Message, ../models/EvolutionInstance, ../models/Lead
- `services/companyService.js`
  • Models importados: ../models/Company
- `services/dashboardService.js`
  • Models importados: ../models/Lead, ../models/LeadStage, ../models/User, ../models/origem, ../models/PropostaContrato
- `services/discardReasonService.js`
  • Models importados: ../models/DiscardReason, ../models/Lead
- `services/empreendimentoService.js`
  • Models importados: ../models/Empreendimento, ../models/Unidade
- `services/evolutionWebhookService.js`
  • Models importados: ../models/Lead, ../models/EvolutionInstance, ../models/Conversation, ../models/Message
- `services/FileService.js`
  • Models importados: ../models/Arquivo, ../models/Lead, ../models/PropostaContrato, ../models/Empreendimento
- `services/FinanceiroService.js`
  • Models importados: ../models/PropostaContrato, ../models/Parcela, ../models/Transacao, ../models/Lead, ../models/Credor, ../models/Despesa
- `services/ImovelAvulsoService.js`
  • Models importados: ../models/ImovelAvulso
- `services/IndexadorService.js`
  • Models importados: ../models/Indexador
- `services/integrationService.js`
  • Models importados: ../models/Company, ../models/User, ../models/Lead, ../models/origem, ../models/EvolutionInstance, ../models/PropostaContrato, ../models/Arquivo
- `services/leadHistoryService.js`
  • Models importados: ../models/LeadHistory, ../models/Lead
- `services/LeadService.js`
  • Models importados: ../models/Lead, ../models/origem, ../models/LeadStage, ../models/User, ../models/DiscardReason, ../models/LeadHistory
- `services/LeadStageService.js`
  • Models importados: ../models/LeadStage, ../models/Lead
- `services/ModeloContratoService.js`
  • Models importados: ../models/ModeloContrato, ../models/PropostaContrato
- `services/origemService.js`
  • Models importados: ../models/origem, ../models/Lead
- `services/PropostaContratoService.js`
  • Models importados: ../models/PropostaContrato, ../models/Reserva, ../models/Arquivo, ../models/Lead, ../models/Unidade, ../models/Empreendimento, ../models/Company, ../models/LeadStage, ../models/User, ../models/ModeloContrato, ../models/BrokerContact, ../models/DiscardReason
- `services/PublicService.js`
  • Models importados: ../models/BrokerContact, ../models/Lead, ../models/Company
- `services/ReajusteService.js`
  • Models importados: ../models/Indexador, ../models/PropostaContrato, ../models/Parcela
- `services/ReservaService.js`
  • Models importados: ../models/Reserva, ../models/Lead, ../models/Unidade, ../models/Empreendimento, ../models/ImovelAvulso, ../models/LeadStage, ../models/PropostaContrato, ../models/Parcela, ../models/Company
- `services/SignatureService.js`
  • Models importados: ../models/PropostaContrato, ../models/Company, ../models/Arquivo
- `services/TaskService.js`
  • Models importados: ../models/Task, ../models/Lead
- `services/unidadeService.js`
  • Models importados: ../models/Unidade, ../models/Empreendimento
- `services/UserService.js`
  • Models importados: ../models/User, ../models/Lead
- `services/webhookService.js`
  • Models importados: ../models/Company, ../models/User, ../models/origem, ../models/Lead

Controllers que importam **services**:

- `controllers/authController.js`
  • Services importados: ../services/authService
- `controllers/brokerContactController.js`
  • Services importados: ../services/brokerContactService
- `controllers/ChatController.js`
  • Services importados: ../services/ChatService
- `controllers/companyController.js`
  • Services importados: ../services/companyService
- `controllers/dashboardController.js`
  • Services importados: ../services/dashboardService
- `controllers/discardReasonController.js`
  • Services importados: ../services/discardReasonService
- `controllers/empreendimentoController.js`
  • Services importados: ../services/empreendimentoService
- `controllers/evolutionWebhookController.js`
  • Services importados: ../services/evolutionWebhookService
- `controllers/FileController.js`
  • Services importados: ../services/FileService
- `controllers/FinanceiroController.js`
  • Services importados: ../services/FinanceiroService, ../services/IndexadorService
- `controllers/ImovelAvulsoController.js`
  • Services importados: ../services/ImovelAvulsoService
- `controllers/integrationController.js`
  • Services importados: ../services/integrationService, ../services/evolutionWebhookService
- `controllers/LeadController.js`
  • Services importados: ../services/LeadService, ../services/leadHistoryService
- `controllers/LeadRequestController.js`
  • Services importados: ../services/origemService, ../services/FileService
- `controllers/LeadStageController.js`
  • Services importados: ../services/LeadStageService
- `controllers/ModeloContratoController.js`
  • Services importados: ../services/ModeloContratoService
- `controllers/OrigemController.js`
  • Services importados: ../services/origemService
- `controllers/PropostaContratoController.js`
  • Services importados: ../services/PropostaContratoService
- `controllers/PublicController.js`
  • Services importados: ../services/PublicService
- `controllers/ReservaController.js`
  • Services importados: ../services/ReservaService
- `controllers/SignatureController.js`
  • Services importados: ../services/SignatureService, ../services/integrationService
- `controllers/TaskController.js`
  • Services importados: ../services/TaskService
- `controllers/unidadeController.js`
  • Services importados: ../services/unidadeService
- `controllers/UserController.js`
  • Services importados: ../services/UserService
- `controllers/webhookController.js`
  • Services importados: ../services/webhookService
