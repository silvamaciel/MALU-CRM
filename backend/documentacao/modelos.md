# Modelos (Mongoose)
Modelos detectados: **28**

- **Arquivo**  
  • Definição em: `models/Arquivo.js`  • Schema: `arquivoSchema`
- **BrokerContact**  
  • Definição em: `models/BrokerContact.js`  • Schema: `brokerContactSchema`
- **Company**  
  • Definição em: `models/Company.js`  • Schema: `companySchema`
- **Conversation**  
  • Definição em: `models/Conversation.js`  • Schema: `conversationSchema`
- **Credor**  
  • Definição em: `models/Credor.js`  • Schema: `credorSchema`
- **Despesa**  
  • Definição em: `models/Despesa.js`  • Schema: `despesaSchema`
- **DiscardReason**  
  • Definição em: `models/DiscardReason.js`  • Schema: `discardReasonSchema`
- **Empreendimento**  
  • Definição em: `models/Empreendimento.js`  • Schema: `empreendimentoSchema`
- **EvolutionInstance**  
  • Definição em: `models/EvolutionInstance.js`  • Schema: `evolutionInstanceSchema`
- **ImovelAvulso**  
  • Definição em: `models/ImovelAvulso.js`  • Schema: `imovelAvulsoSchema`
- **Indexador**  
  • Definição em: `models/Indexador.js`  • Schema: `indexadorSchema`
- **Lead**  
  • Definição em: `models/Lead.js`  • Schema: `leadSchema`
- **LeadHistory**  
  • Definição em: `models/LeadHistory.js`  • Schema: `leadHistorySchema`
- **LeadRequest**  
  • Definição em: `models/LeadRequest.js`  • Schema: `leadRequestSchema`
- **LeadStage**  
  • Definição em: `models/LeadStage.js`  • Schema: `leadStageSchema`
- **Message**  
  • Definição em: `models/Message.js`  • Schema: `messageSchema`
- **ModeloContrato**  
  • Definição em: `models/ModeloContrato.js`  • Schema: `modeloContratoSchema`
- **Origem**  
  • Definição em: `models/origem.js`  • Schema: `origemSchema`
- **Parcela**  
  • Definição em: `models/Parcela.js`  • Schema: `parcelaSchema`
- **PropostaContrato**  
  • Definição em: `models/PropostaContrato.js`  • Schema: `propostaContratoSchema`
- **Lead**  
  • Definição em: `models/Reserva.js`
- **Unidade**  
  • Definição em: `models/Reserva.js`
- **Reserva**  
  • Definição em: `models/Reserva.js`  • Schema: `reservaSchema`
- **Task**  
  • Definição em: `models/Task.js`  • Schema: `taskSchema`
- **Transacao**  
  • Definição em: `models/Transacao.js`  • Schema: `transacaoSchema`
- **Empreendimento**  
  • Definição em: `models/Unidade.js`
- **Unidade**  
  • Definição em: `models/Unidade.js`  • Schema: `unidadeSchema`
- **User**  
  • Definição em: `models/User.js`  • Schema: `userSchema`

## Campos por Schema (heurístico)
### Schema `associacaoSchema` em `models/Arquivo.js`
  - `kind` | type: String | required: true | enum: [Lead, PropostaContrato, Empreendimento, Unidade, ImovelAvulso, User, LeadRequest]
  - `item` | type: ObjectId | required: true

**Opções**:
  - _id: false

### Schema `arquivoSchema` em `models/Arquivo.js`
  - `nomeOriginal` | type: String | required: true
  - `nomeNoBucket` | type: String | required: true | unique: true
  - `url` | type: String | required: true | unique: true
  - `mimetype` | type: String | required: true
  - `pasta` | type: String | index: true
  - `size` | type: Number | required: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `uploadedBy` | type: ObjectId | ref: User | required: true
  - `categoria` | type: String | required: true | index: true | enum: [Contratos, Documentos Leads, Materiais Empreendimentos, Recibos, Parcela, Identidade Visual, Mídia WhatsApp, Outros]
  - `associations` | type: Array<associacaoSchema>

**Opções**:
  - timestamps: true

### Schema `brokerContactSchema` em `models/BrokerContact.js`
  - `nome` | type: String | required: true | index: true
  - `contato` | type: String | required: false
  - `email` | type: String | required: false | unique: true
  - `creci` | type: String | required: false | index: true
  - `nomeImobiliaria` | type: String | required: false
  - `cpfCnpj` | type: String | required: false
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true
  - `publicSubmissionToken` | type: String | unique: true | index: true | default: func

**Indexes**:
  - index( company:1, cpf:1 ) { unique:true, partialFilterExpression:true }
  - index( company:1, creci:1 ) { unique:true, partialFilterExpression:true }

**Opções**:
  - timestamps: true

### Schema `companySchema` em `models/Company.js`
  - `nome` | type: String | required: true
  - `cnpj` | type: String | required: true | unique: true | index: true
  - `ativo` | type: Boolean | default: true
  - `facebookPageId` | type: String | unique: true | index: true
  - `autentiqueApiToken` | type: String
  - `linkedFacebookForms` | type: Array<Subdoc>
  - `facebookConnectedByUserId` | type: ObjectId | ref: User | required: false
  - `publicBrokerToken` | type: String | unique: true | index: true | default: func
  - `facebookWebhookSubscriptionId` | type: String

**Opções**:
  - timestamps: true

### Schema `conversationSchema` em `models/Conversation.js`
  - `lead` | type: ObjectId | ref: Lead | required: false | default: func
  - `leadNameSnapshot` | type: String
  - `tempContactName` | type: String
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `channel` | type: String | required: true | default: WhatsApp | enum: [WhatsApp, Instagram, FacebookMessenger]
  - `channelInternalId` | type: String | required: true
  - `lastMessage` | type: String
  - `lastMessageAt` | type: Date | index: true | default: func
  - `unreadCount` | type: Number | default: 0
  - `instance` | type: ObjectId | ref: EvolutionInstance
  - `instanceName` | type: String
  - `contactPhotoUrl` | type: String

**Indexes**:
  - index( lead:1, channel:1 ) { unique:true }
  - index( company:1, lastMessageAt:-1, _id:-1 ) 

**Opções**:
  - timestamps: true

### Schema `dadosBancariosSchema` em `models/Credor.js`
  - `banco` | type: String
  - `agencia` | type: String
  - `conta` | type: String
  - `tipoConta` | type: String | enum: [Corrente, Poupança]
  - `pix` | type: String

**Opções**:
  - _id: false

### Schema `credorSchema` em `models/Credor.js`
  - `nome` | type: String | required: true
  - `cpfCnpj` | type: String | unique: true
  - `tipo` | type: String | required: true | default: Fornecedor | enum: [Corretor, Funcionário, Fornecedor, Outro]
  - `brokerContactRef` | type: ObjectId | ref: BrokerContact | default: func
  - `userRef` | type: ObjectId | ref: User | default: func
  - `contato` | type: String
  - `email` | type: String
  - `dadosBancarios` | type: dadosBancariosSchema
  - `company` | type: ObjectId | ref: Company | required: true | index: true

**Indexes**:
  - index( company:1, nome:1 ) 

**Opções**:
  - timestamps: true

### Schema `despesaSchema` em `models/Despesa.js`
  - `descricao` | type: String | required: true
  - `credor` | type: ObjectId | ref: Credor | required: true | index: true
  - `contrato` | type: ObjectId | ref: PropostaContrato | default: func
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `valor` | type: Number | required: true
  - `dataVencimento` | type: Date | required: true | index: true
  - `dataPagamento` | type: Date | default: func
  - `status` | type: String | index: true | default: A Pagar | enum: [A Pagar, Paga, Atrasada, Cancelada]
  - `centroDeCusto` | type: String | default: Outros | enum: [Comissões, Marketing, Operacional, Outros]
  - `observacoes` | type: String
  - `registradoPor` | type: ObjectId | ref: User | required: true

**Opções**:
  - timestamps: true

### Schema `discardReasonSchema` em `models/DiscardReason.js`
  - `nome` | type: String | required: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true

**Indexes**:
  - index( company:1, nome:1 ) { unique:true }

**Opções**:
  - timestamps: true

### Schema `localizacaoSchema` em `models/Empreendimento.js`
  - `logradouro` | type: String
  - `numero` | type: String
  - `bairro` | type: String
  - `cidade` | type: String | required: true
  - `uf` | type: String | required: true
  - `cep` | type: String
  - `latitude` | type: String
  - `longitude` | type: String

**Opções**:
  - _id: false

### Schema `imagemSchema` em `models/Empreendimento.js`
  - `url` | type: String | required: false
  - `thumbnailUrl` | type: String
  - `altText` | type: String

**Opções**:
  - _id: false

### Schema `empreendimentoSchema` em `models/Empreendimento.js`
  - `nome` | type: String | required: true | index: true
  - `construtoraIncorporadora` | type: String
  - `localizacao` | type: localizacaoSchema
  - `tipo` | type: String | required: true
  - `statusEmpreendimento` | type: String | required: true | default: Em Planejamento
  - `descricao` | type: String
  - `imagemPrincipal` | type: imagemSchema
  - `dataPrevistaEntrega` | type: Date | required: false
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true

**Indexes**:
  - index( nome:1, company:1 ) { unique:true }

**Opções**:
  - timestamps: true
  - toJSON: true
  - toObject: true

### Schema `evolutionInstanceSchema` em `models/EvolutionInstance.js`
  - `instanceName` | type: String | required: true
  - `instanceId` | type: String | required: true | unique: true
  - `receiveFromGroups` | type: Boolean | default: false
  - `autoCreateLead` | type: Boolean | default: true
  - `apiKey` | type: String | required: true
  - `status` | type: String | default: created
  - `ownerNumber` | type: String
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `createdBy` | type: ObjectId | ref: User | required: true

**Indexes**:
  - index( company:1, instanceName:1 ) { unique:true }

**Opções**:
  - timestamps: true

### Schema `enderecoSchema` em `models/ImovelAvulso.js`
  - `logradouro` | type: String
  - `numero` | type: String
  - `complemento` | type: String
  - `bairro` | type: String | index: true
  - `cidade` | type: String | required: true | index: true
  - `uf` | type: String | required: true
  - `cep` | type: String

**Opções**:
  - _id: false

### Schema `imovelAvulsoSchema` em `models/ImovelAvulso.js`
  - `titulo` | type: String | required: true
  - `descricao` | type: String
  - `tipoImovel` | type: String | required: true | index: true | enum: [Apartamento, Casa, Terreno, Sala Comercial, Loja, Galpão, Outro]
  - `status` | type: String | required: true | index: true | default: Disponível | enum: [Disponível, Reservado, Vendido, Inativo, Proposta]
  - `quartos` | type: Number | default: 0
  - `suites` | type: Number | default: 0
  - `banheiros` | type: Number | default: 0
  - `vagasGaragem` | type: Number | default: 0
  - `areaTotal` | type: Number | required: true
  - `construtoraNome` | type: String | index: true
  - `preco` | type: Number | required: true
  - `endereco` | type: enderecoSchema
  - `fotos` | type: Array<Subdoc>
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `responsavel` | type: ObjectId | ref: User | required: true
  - `currentLeadId` | type: ObjectId | ref: Lead | default: func
  - `currentReservaId` | type: ObjectId | ref: Reserva | default: func

**Indexes**:
  - index( company:1, tipoImovel:1, status:1 ) 

**Opções**:
  - timestamps: true

### Schema `valorIndexadorSchema` em `models/Indexador.js`
  - `mesAno` | type: String | required: true
  - `valor` | type: Number | required: true

**Opções**:
  - _id: false

### Schema `indexadorSchema` em `models/Indexador.js`
  - `nome` | type: String | required: true | unique: true
  - `descricao` | type: String
  - `valores` | type: Array<valorIndexadorSchema>
  - `company` | type: ObjectId | ref: Company | required: true | index: true

**Indexes**:
  - index( company:1, nome:1 ) { unique:true }
  - index( valores.mesAno:1 ) { unique:true, partialFilterExpression:true }

**Opções**:
  - timestamps: true

### Schema `coadquirenteSchema` em `models/Lead.js`
  - `nome` | type: String | required: true
  - `cpf` | type: String
  - `rg` | type: String
  - `nacionalidade` | type: String | default: Brasileiro(a)
  - `estadoCivil` | type: String | enum: [Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável, Outro]
  - `profissao` | type: String
  - `email` | type: String
  - `contato` | type: String
  - `endereco` | type: String
  - `nascimento` | type: Date

**Opções**:
  - _id: false

### Schema `leadSchema` em `models/Lead.js`
  - `nome` | type: String | required: true
  - `contato` | type: String | required: true
  - `email` | type: String | required: true | unique: true
  - `nascimento` | type: Date | required: false
  - `endereco` | type: String | required: false
  - `cpf` | type: String | required: false | unique: true
  - `rg` | type: String
  - `nacionalidade` | type: String | default: Brasileiro(a)
  - `estadoCivil` | type: String | enum: [Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável, Outro]
  - `profissao` | type: String
  - `nascimento` | type: Date
  - `endereco` | type: String
  - `coadquirentes` | type: Array<coadquirenteSchema> | default: func
  - `situacao` | type: ObjectId | ref: LeadStage | required: true | index: true
  - `motivoDescarte` | type: ObjectId | ref: DiscardReason | required: false | default: func
  - `comentario` | type: String | default: func
  - `origem` | type: ObjectId | ref: Origem | required: true
  - `responsavel` | type: ObjectId | ref: User | required: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `tags` | type: Array<String>
  - `submittedByBroker` | type: ObjectId | ref: BrokerContact | default: func
  - `corretorResponsavel` | type: ObjectId | ref: BrokerContact | default: func
  - `approvalStatus` | type: String | index: true | default: Aprovado | enum: [Aprovado, Pendente, Rejeitado]

**Indexes**:
  - index( company:1, contato:1 ) { unique:true, sparse:true }
  - index( company:1, email:1 ) { unique:true, sparse:true }

**Opções**:
  - timestamps: true

### Schema `leadHistorySchema` em `models/LeadHistory.js`
  - `lead` | type: ObjectId | ref: Lead | required: true | index: true
  - `user` | type: ObjectId | ref: User | required: false | default: func
  - `action` | type: String | required: true | enum: [CRIACAO, ATUALIZACAO, DESCARTE, REATIVACAO, RESERVA_CRIADA, RESERVA_CANCELADA, RESERVA_EXPIRADA, RESERVA_EXCLUIDA, PROPOSTA_CRIADA, RESERVA_CANCELADA_STATUS_LEAD, UNIDADE_LIBERADA, PROPOSTA_CONTRATO_CRIADA, PROPOSTA_STATUS_ALTERADO, VENDA_CONCRETIZADA, DISTRATO_REALIZADO, PROPOSTA_STATUS_ASSINADO, PROPOSTA_STATUS_VENDIDO, PROPOSTA_STATUS_RECUSADO, PROPOSTA_STATUS_CANCELADO, PROPOSTA_STATUS_DISTRATO_REALIZADO, DISTRATO_REALIZADO, PROPOSTA_STATUS_AGUARDANDO_ASSINATURA_CLIENTE, PROPOSTA_CONTRATO_EDITADA, PROPOSTA_STATUS_AGUARDANDO_APROVAÇÕES, EDICAO_DADOS]
  - `details` | type: String | default: 

**Opções**:
  - timestamps: true

### Schema `coadquirenteSchema` em `models/LeadRequest.js`
  - `nome` | type: String | required: true
  - `cpf` | type: String
  - `rg` | type: String
  - `nacionalidade` | type: String | default: Brasileiro(a)
  - `estadoCivil` | type: String | enum: [Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável, Outro]
  - `profissao` | type: String
  - `email` | type: String
  - `contato` | type: String
  - `endereco` | type: String
  - `nascimento` | type: Date

**Opções**:
  - _id: false

### Schema `leadRequestSchema` em `models/LeadRequest.js`
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `nome` | type: String | required: true
  - `contato` | type: String | required: true
  - `email` | type: String
  - `nascimento` | type: Date
  - `endereco` | type: String
  - `cpf` | type: String
  - `rg` | type: String
  - `nacionalidade` | type: String | default: Brasileiro(a)
  - `estadoCivil` | type: String | enum: [Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável, Outro]
  - `profissao` | type: String
  - `comentario` | type: String | default: func
  - `origem` | type: ObjectId | ref: Origem | default: func
  - `coadquirentes` | type: Array<coadquirenteSchema> | default: func
  - `corretorResponsavel` | type: ObjectId | ref: BrokerContact | required: true
  - `submittedByBroker` | type: ObjectId | ref: BrokerContact | required: true
  - `tags` | type: Array<String>
  - `status` | type: String | index: true | default: Pendente | enum: [Pendente, Aprovado, Rejeitado]
  - `rejectReason` | type: String | default: func

**Indexes**:
  - index( company:1, contato:1, status:1 ) 
  - index( company:1, email:1, status:1 ) { sparse:true }

**Opções**:
  - timestamps: true

### Schema `leadStageSchema` em `models/LeadStage.js`
  - `nome` | type: String | required: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true
  - `ordem` | type: Number | default: 0

**Indexes**:
  - index( company:1, nome:1 ) { unique:true }
  - index( company:1, ordem:1 ) 

**Opções**:
  - timestamps: true

### Schema `messageSchema` em `models/Message.js`
  - `conversation` | type: ObjectId | ref: Conversation | required: true | index: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `channelMessageId` | type: String | unique: true
  - `direction` | type: String | required: true | enum: [incoming, outgoing]
  - `senderId` | type: String
  - `contentType` | type: String | required: true | default: text | enum: [text, image, audio, document, other]
  - `content` | type: String | required: true
  - `mediaUrl` | type: String
  - `mediaMimeType` | type: String
  - `read` | type: Boolean | index: true | default: false
  - `status` | type: String | default: sent | enum: [sent, delivered, read, failed]

**Indexes**:
  - index( conversation:1, createdAt:-1 ) 

**Opções**:
  - timestamps: true

### Schema `modeloContratoSchema` em `models/ModeloContrato.js`
  - `nomeModelo` | type: String | required: true
  - `tipoDocumento` | type: String | required: true | default: Contrato de Compra e Venda | enum: [Proposta, Contrato de Reserva, Contrato de Compra e Venda, Outro]
  - `conteudoHTMLTemplate` | type: String | required: true
  - `placeholdersDisponiveis` | type: Array<Mixed>
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true

**Indexes**:
  - index( nomeModelo:1, company:1 ) { unique:true }

**Opções**:
  - timestamps: true

### Schema `origemSchema` em `models/origem.js`
  - `nome` | type: String | required: true
  - `descricao` | type: String
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true

**Indexes**:
  - index( company:1, nome:1 ) { unique:true }

**Opções**:
  - timestamps: true

### Schema `parcelaSchema` em `models/Parcela.js`
  - `contrato` | type: ObjectId | ref: PropostaContrato | required: false | index: true | default: func
  - `sacado` | type: ObjectId | ref: Lead | required: true | index: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `numeroParcela` | type: Number | required: true
  - `tipo` | type: String | required: true | default: Parcela Mensal | enum: [ATO, PARCELA MENSAL, PARCELA BIMESTRAL, PARCELA TRIMESTRAL, PARCELA SEMESTRAL, INTERCALADA, ENTREGA DE CHAVES, FINANCIAMENTO, OUTRA]
  - `valorPrevisto` | type: Number | required: true
  - `valorPago` | type: Number | required: true | default: 0
  - `dataVencimento` | type: Date | required: true | index: true
  - `dataPagamento` | type: Date | default: func
  - `status` | type: String | index: true | default: Pendente | enum: [Pendente, Pago, Pago com Atraso, Atrasado, Cancelado, Renegociada]
  - `historicoAlteracoes` | type: Array<Subdoc>
  - `observacoes` | type: String

**Indexes**:
  - index( company:1, status:1, dataVencimento:1 ) 
  - index( company:1, dataVencimento:1 ) 
  - index( company:1, sacado:1 ) 

**Opções**:
  - timestamps: true

### Schema `regraReajusteSchema` em `models/PropostaContrato.js`
  - `aplicaA` | type: Array<String>
  - `indexadorReajuste` | type: ObjectId | ref: Indexador
  - `inicioReajuste` | type: String | required: true
  - `periodicidade` | type: String | default: Anual | enum: [Mensal, Anual]
  - `aplicaMultaAtraso` | type: Boolean | default: true
  - `multaPercentual` | type: Number | default: 2
  - `aplicaJurosAtraso` | type: Boolean | default: true
  - `jurosMensalPercentual` | type: Number | default: 1

**Opções**:
  - _id: false

### Schema `parcelaSchema` em `models/PropostaContrato.js`
  - `tipoParcela` | type: String | required: true | enum: [ATO, PARCELA MENSAL, PARCELA BIMESTRAL, PARCELA TRIMESTRAL, PARCELA SEMESTRAL, INTERCALADA, ENTREGA DE CHAVES, FINANCIAMENTO, OUTRA]
  - `quantidade` | type: Number | default: 1
  - `valorUnitario` | type: Number | required: true
  - `vencimentoPrimeira` | type: Date | required: true
  - `observacao` | type: String

**Opções**:
  - _id: false

### Schema `dadosBancariosSchema` em `models/PropostaContrato.js`
  - `bancoNome` | type: String
  - `agencia` | type: String
  - `operacao` | type: String
  - `contaCorrente` | type: String
  - `cnpjPagamento` | type: String
  - `pix` | type: String

**Opções**:
  - _id: false

### Schema `corretagemSchema` em `models/PropostaContrato.js`
  - `valorCorretagem` | type: Number | required: true
  - `corretorPrincipal` | type: ObjectId | ref: BrokerContact | required: false
  - `corretoresEnvolvidos` | type: Array<Subdoc>
  - `condicoesPagamentoCorretagem` | type: String
  - `observacoesCorretagem` | type: String

**Opções**:
  - _id: false

### Schema `adquirenteSnapshotSchema` em `models/PropostaContrato.js`
  - `nome` | type: String | required: true
  - `cpf` | type: String
  - `rg` | type: String
  - `nacionalidade` | type: String
  - `estadoCivil` | type: String
  - `profissao` | type: String
  - `email` | type: String | required: false
  - `contato` | type: String | required: true
  - `endereco` | type: String
  - `nascimento` | type: Date

**Opções**:
  - _id: false

### Schema `signatarioSchema` em `models/PropostaContrato.js`
  - `nome` | type: String
  - `email` | type: String
  - `cpf` | type: String
  - `autentiqueSignerId` | type: String
  - `status` | type: String | default: Pendente | enum: [Pendente, Assinado]

**Opções**:
  - _id: false

### Schema `propostaContratoSchema` em `models/PropostaContrato.js`
  - `lead` | type: ObjectId | ref: Lead | required: true | index: true
  - `reserva` | type: ObjectId | ref: Reserva | required: true | unique: true | index: true
  - `imovel` | type: ObjectId | required: true
  - `tipoImovel` | type: String | required: true | enum: [Unidade, ImovelAvulso]
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `adquirentesSnapshot` | type: Array<adquirenteSnapshotSchema> | required: true
  - `modeloContratoUtilizado` | type: ObjectId | ref: ModeloContrato | required: false
  - `autentiqueDocumentId` | type: String | index: true | default: func
  - `signatarios` | type: Array<signatarioSchema>
  - `statusAssinatura` | type: String | index: true | default: Não Enviado | enum: [Não Enviado, Aguardando Assinaturas, Finalizado, Recusado]
  - `precoTabelaUnidadeNoMomento` | type: Number | required: true
  - `valorPropostaContrato` | type: Number | required: true
  - `valorDescontoConcedido` | type: Number | default: 0
  - `valorEntrada` | type: Number
  - `condicoesPagamentoGerais` | type: String
  - `dadosBancariosParaPagamento` | type: dadosBancariosSchema
  - `planoDePagamento` | type: Array<parcelaSchema>
  - `corretagem` | type: corretagemSchema
  - `regrasDeReajuste` | type: Array<regraReajusteSchema>
  - `corpoContratoHTMLGerado` | type: String | required: true
  - `dataProposta` | type: Date | default: func
  - `dataAssinaturaCliente` | type: Date
  - `dataVendaEfetivada` | type: Date
  - `statusPropostaContrato` | type: String | required: true | index: true | default: Em Elaboração | enum: [Em Elaboração, Aguardando Aprovações, Aguardando Assinatura Cliente, Assinado, Vendido, Recusado, Cancelado, Distrato Realizado]
  - `responsavelNegociacao` | type: ObjectId | ref: User | required: true
  - `createdBy` | type: ObjectId | ref: User | required: true
  - `observacoesInternasProposta` | type: String
  - `dataDistrato` | type: Date
  - `motivoDistrato` | type: String

**Opções**:
  - timestamps: true

### Schema `reservaSchema` em `models/Reserva.js`
  - `lead` | type: ObjectId | ref: Lead | required: true | index: true
  - `imovel` | type: ObjectId | required: true
  - `tipoImovel` | type: String | required: true | enum: [Unidade, ImovelAvulso]
  - `company` | type: ObjectId | ref: Company | required: false | index: true
  - `dataReserva` | type: Date | required: true | default: func
  - `validadeReserva` | type: Date | required: true
  - `valorSinal` | type: Number | required: false
  - `observacoesReserva` | type: String
  - `statusReserva` | type: String | required: true | index: true | default: Ativa
  - `createdBy` | type: ObjectId | ref: User | required: true
  - `propostaId` | type: ObjectId | ref: Proposta | required: false
  - `vendaId` | type: ObjectId | ref: Venda | required: false

**Indexes**:
  - index( imovel:1, statusReserva:1 ) { unique:true, partialFilterExpression:true, name:imovel_statusReserva_ativa_unique_idx }

**Opções**:
  - timestamps: true

### Schema `taskSchema` em `models/Task.js`
  - `title` | type: String | required: true
  - `description` | type: String
  - `status` | type: String | index: true | default: Pendente | enum: [Pendente, Concluída]
  - `dueDate` | type: Date | required: true
  - `lead` | type: ObjectId | ref: Lead | required: true | index: true
  - `assignedTo` | type: ObjectId | ref: User | required: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `createdBy` | type: ObjectId | ref: User | required: true

**Indexes**:
  - index( company:1, status:1, dueDate:1 ) 

**Opções**:
  - timestamps: true

### Schema `transacaoSchema` em `models/Transacao.js`
  - `parcela` | type: ObjectId | ref: Parcela | required: true | index: true
  - `contrato` | type: ObjectId | ref: PropostaContrato | required: true
  - `sacado` | type: ObjectId | ref: Lead | required: true | index: true
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `valor` | type: Number | required: true
  - `metodoPagamento` | type: String | required: true | enum: [PIX, Transferência, Boleto, Cartão, Dinheiro, Outro]
  - `dataTransacao` | type: Date | required: true
  - `registradoPor` | type: ObjectId | ref: User | required: true
  - `comprovanteUrl` | type: String

**Opções**:
  - timestamps: true

### Schema `unidadeSchema` em `models/Unidade.js`
  - `empreendimento` | type: ObjectId | ref: Empreendimento | required: true | index: true
  - `identificador` | type: String | required: true
  - `tipologia` | type: String
  - `areaUtil` | type: Number
  - `areaTotal` | type: Number
  - `precoTabela` | type: Number
  - `statusUnidade` | type: String | required: true | default: Disponível
  - `descricao` | type: String
  - `destaque` | type: Boolean | default: false
  - `company` | type: ObjectId | ref: Company | required: true | index: true
  - `ativo` | type: Boolean | default: true
  - `currentLeadId` | type: ObjectId | ref: Lead | required: false | index: true | default: func
  - `currentReservaId` | type: ObjectId | ref: Reserva
  - `currentLeadId` | type: ObjectId | ref: Lead | required: false | index: true | default: func
  - `currentReservaId` | type: ObjectId | ref: Reserva | required: false | unique: true | default: func

**Indexes**:
  - index( empreendimento:1, identificador:1 ) { unique:true }

**Opções**:
  - timestamps: true

### Schema `userSchema` em `models/User.js`
  - `nome` | type: String | required: true
  - `email` | type: String | required: true | unique: true
  - `senha` | type: String | required: false
  - `perfil` | type: String | required: true | default: corretor | enum: [admin, corretor]
  - `company` | type: ObjectId | ref: Company | required: true
  - `googleId` | type: String | unique: true | index: true
  - `ativo` | type: Boolean | default: true
  - `googleRefreshToken` | type: String

**Opções**:
  - timestamps: true

