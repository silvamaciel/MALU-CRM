# Modelos (Mongoose)

Modelos detectados: **28**

- **Arquivo**  
  • Definição em: `models/Arquivo.js`
- **BrokerContact**  
  • Definição em: `models/BrokerContact.js`
- **Company**  
  • Definição em: `models/Company.js`
- **Conversation**  
  • Definição em: `models/Conversation.js`
- **Credor**  
  • Definição em: `models/Credor.js`
- **Despesa**  
  • Definição em: `models/Despesa.js`
- **DiscardReason**  
  • Definição em: `models/DiscardReason.js`
- **Empreendimento**  
  • Definição em: `models/Empreendimento.js`
- **EvolutionInstance**  
  • Definição em: `models/EvolutionInstance.js`
- **ImovelAvulso**  
  • Definição em: `models/ImovelAvulso.js`
- **Indexador**  
  • Definição em: `models/Indexador.js`
- **Lead**  
  • Definição em: `models/Lead.js`
- **LeadHistory**  
  • Definição em: `models/LeadHistory.js`
- **LeadRequest**  
  • Definição em: `models/LeadRequest.js`
- **LeadStage**  
  • Definição em: `models/LeadStage.js`
- **Message**  
  • Definição em: `models/Message.js`
- **ModeloContrato**  
  • Definição em: `models/ModeloContrato.js`
- **Origem**  
  • Definição em: `models/origem.js`
- **Parcela**  
  • Definição em: `models/Parcela.js`
- **PropostaContrato**  
  • Definição em: `models/PropostaContrato.js`
- **Lead**  
  • Definição em: `models/Reserva.js`
- **Unidade**  
  • Definição em: `models/Reserva.js`
- **Reserva**  
  • Definição em: `models/Reserva.js`
- **Task**  
  • Definição em: `models/Task.js`
- **Transacao**  
  • Definição em: `models/Transacao.js`
- **Empreendimento**  
  • Definição em: `models/Unidade.js`
- **Unidade**  
  • Definição em: `models/Unidade.js`
- **User**  
  • Definição em: `models/User.js`

## Campos por Schema (heurístico)

### Schema em `models/Arquivo.js`
  - `kind`: String
  - `item`: Subdoc

### Schema em `models/Arquivo.js`
  - `nomeOriginal`: String
  - `nomeNoBucket`: String
  - `url`: String
  - `mimetype`: String
  - `pasta`: String
  - `size`: Number
  - `company`: Mixed (ref Company)
  - `uploadedBy`: Mixed (ref User)
  - `categoria`: String
  - `associations`: Array<associacaoSchema>

### Schema em `models/BrokerContact.js`
  - `nome`: String
  - `contato`: String
  - `email`: String
  - `creci`: String
  - `nomeImobiliaria`: String
  - `cpfCnpj`: String
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean
  - `publicSubmissionToken`: String

### Schema em `models/Company.js`
  - `nome`: String
  - `cnpj`: String
  - `ativo`: Boolean
  - `facebookPageId`: String
  - `autentiqueApiToken`: String
  - `linkedFacebookForms`: Array<Subdoc>
  - `facebookConnectedByUserId`: Mixed (ref User)
  - `publicBrokerToken`: String
  - `facebookWebhookSubscriptionId`: String

### Schema em `models/Conversation.js`
  - `lead`: Mixed (ref Lead)
  - `leadNameSnapshot`: String
  - `tempContactName`: String
  - `company`: Mixed (ref Company)
  - `channel`: String
  - `channelInternalId`: String
  - `lastMessage`: String
  - `lastMessageAt`: Date
  - `unreadCount`: Number
  - `instance`: Mixed (ref EvolutionInstance)
  - `instanceName`: String
  - `contactPhotoUrl`: String

### Schema em `models/Credor.js`
  - `banco`: String
  - `agencia`: String
  - `conta`: String
  - `tipoConta`: String
  - `pix`: String

### Schema em `models/Credor.js`
  - `nome`: String
  - `cpfCnpj`: String
  - `tipo`: String
  - `brokerContactRef`: Mixed (ref BrokerContact)
  - `userRef`: Mixed (ref User)
  - `contato`: String
  - `email`: String
  - `dadosBancarios`: dadosBancariosSchema
  - `company`: Mixed (ref Company)

### Schema em `models/Despesa.js`
  - `descricao`: String
  - `credor`: Mixed (ref Credor)
  - `contrato`: Mixed (ref PropostaContrato)
  - `company`: Mixed (ref Company)
  - `valor`: Number
  - `dataVencimento`: Date
  - `dataPagamento`: Date
  - `status`: String
  - `centroDeCusto`: String
  - `observacoes`: String
  - `registradoPor`: Mixed (ref User)

### Schema em `models/DiscardReason.js`
  - `nome`: String
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean

### Schema em `models/Empreendimento.js`
  - `logradouro`: String
  - `numero`: String
  - `bairro`: String
  - `cidade`: String
  - `uf`: String
  - `cep`: String
  - `latitude`: String
  - `longitude`: String

### Schema em `models/Empreendimento.js`
  - `url`: String
  - `thumbnailUrl`: String
  - `altText`: String

### Schema em `models/Empreendimento.js`
  - `nome`: String
  - `construtoraIncorporadora`: String
  - `localizacao`: localizacaoSchema
  - `tipo`: String
  - `statusEmpreendimento`: String
  - `descricao`: String
  - `imagemPrincipal`: imagemSchema
  - `dataPrevistaEntrega`: Date
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean

### Schema em `models/EvolutionInstance.js`
  - `instanceName`: String
  - `instanceId`: String
  - `receiveFromGroups`: Boolean
  - `autoCreateLead`: Boolean
  - `apiKey`: String
  - `status`: String
  - `ownerNumber`: String
  - `company`: Mixed (ref Company)
  - `createdBy`: Mixed (ref User)

### Schema em `models/ImovelAvulso.js`
  - `logradouro`: String
  - `numero`: String
  - `complemento`: String
  - `bairro`: String
  - `cidade`: String
  - `uf`: String
  - `cep`: String

### Schema em `models/ImovelAvulso.js`
  - `titulo`: String
  - `descricao`: String
  - `tipoImovel`: String
  - `status`: String
  - `quartos`: Number
  - `suites`: Number
  - `banheiros`: Number
  - `vagasGaragem`: Number
  - `areaTotal`: Number
  - `construtoraNome`: String
  - `preco`: Number
  - `endereco`: enderecoSchema
  - `fotos`: Array<Subdoc>
  - `company`: Mixed (ref Company)
  - `responsavel`: Mixed (ref User)
  - `currentLeadId`: Mixed (ref Lead)
  - `currentReservaId`: Mixed (ref Reserva)

### Schema em `models/Indexador.js`
  - `mesAno`: String
  - `valor`: Number

### Schema em `models/Indexador.js`
  - `nome`: String
  - `descricao`: String
  - `valores`: Array<valorIndexadorSchema>
  - `company`: Mixed (ref Company)

### Schema em `models/Lead.js`
  - `nome`: String
  - `cpf`: String
  - `rg`: String
  - `nacionalidade`: String
  - `estadoCivil`: String
  - `profissao`: String
  - `email`: String
  - `contato`: String
  - `endereco`: String
  - `nascimento`: Date

### Schema em `models/Lead.js`
  - `nome`: String
  - `contato`: String
  - `email`: String
  - `nascimento`: Date
  - `endereco`: String
  - `cpf`: String
  - `rg`: String
  - `nacionalidade`: String
  - `estadoCivil`: String
  - `profissao`: String
  - `nascimento`: Date
  - `endereco`: String
  - `coadquirentes`: Subdoc
  - `situacao`: Mixed (ref LeadStage)
  - `motivoDescarte`: Mixed (ref DiscardReason)
  - `comentario`: String
  - `origem`: Mixed (ref Origem)
  - `responsavel`: Mixed (ref User)
  - `company`: Mixed (ref Company)
  - `tags`: Array<String>
  - `submittedByBroker`: Mixed (ref BrokerContact)
  - `corretorResponsavel`: Mixed (ref BrokerContact)
  - `approvalStatus`: String

### Schema em `models/LeadHistory.js`
  - `lead`: Mixed (ref Lead)
  - `user`: Mixed (ref User)
  - `action`: String
  - `details`: String

### Schema em `models/LeadRequest.js`
  - `nome`: String
  - `cpf`: String
  - `rg`: String
  - `nacionalidade`: String
  - `estadoCivil`: String
  - `profissao`: String
  - `email`: String
  - `contato`: String
  - `endereco`: String
  - `nascimento`: Date

### Schema em `models/LeadRequest.js`
  - `company`: Mixed (ref Company)
  - `nome`: String
  - `contato`: String
  - `email`: String
  - `nascimento`: Date
  - `endereco`: String
  - `cpf`: String
  - `rg`: String
  - `nacionalidade`: String
  - `estadoCivil`: String
  - `profissao`: String
  - `comentario`: String
  - `origem`: Mixed (ref Origem)
  - `coadquirentes`: Subdoc
  - `corretorResponsavel`: Mixed (ref BrokerContact)
  - `submittedByBroker`: Mixed (ref BrokerContact)
  - `tags`: Array<String>
  - `status`: String
  - `rejectReason`: String

### Schema em `models/LeadStage.js`
  - `nome`: String
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean
  - `ordem`: Number

### Schema em `models/Message.js`
  - `conversation`: Mixed (ref Conversation)
  - `company`: Mixed (ref Company)
  - `channelMessageId`: String
  - `direction`: String
  - `senderId`: String
  - `contentType`: String
  - `content`: String
  - `mediaUrl`: String
  - `mediaMimeType`: String
  - `read`: Boolean
  - `status`: String

### Schema em `models/ModeloContrato.js`
  - `nomeModelo`: String
  - `tipoDocumento`: String
  - `conteudoHTMLTemplate`: String
  - `placeholdersDisponiveis`: Array<Subdoc>
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean

### Schema em `models/origem.js`
  - `nome`: String
  - `descricao`: String
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean

### Schema em `models/Parcela.js`
  - `contrato`: Mixed (ref PropostaContrato)
  - `sacado`: Mixed (ref Lead)
  - `company`: Mixed (ref Company)
  - `numeroParcela`: Number
  - `tipo`: String
  - `valorPrevisto`: Number
  - `valorPago`: Number
  - `dataVencimento`: Date
  - `dataPagamento`: Date
  - `status`: String
  - `historicoAlteracoes`: Array<Subdoc>
  - `observacoes`: String

### Schema em `models/PropostaContrato.js`
  - `aplicaA`: Array<String>
  - `indexadorReajuste`: Mixed (ref Indexador)
  - `inicioReajuste`: String
  - `periodicidade`: String
  - `aplicaMultaAtraso`: Boolean
  - `multaPercentual`: Number
  - `aplicaJurosAtraso`: Boolean
  - `jurosMensalPercentual`: Number

### Schema em `models/PropostaContrato.js`
  - `tipoParcela`: String
  - `quantidade`: Number
  - `valorUnitario`: Number
  - `vencimentoPrimeira`: Date
  - `observacao`: String

### Schema em `models/PropostaContrato.js`
  - `bancoNome`: String
  - `agencia`: String
  - `operacao`: String
  - `contaCorrente`: String
  - `cnpjPagamento`: String
  - `pix`: String

### Schema em `models/PropostaContrato.js`
  - `valorCorretagem`: Number
  - `corretorPrincipal`: Mixed (ref BrokerContact)
  - `corretoresEnvolvidos`: Array<Subdoc>
  - `condicoesPagamentoCorretagem`: String
  - `observacoesCorretagem`: String

### Schema em `models/PropostaContrato.js`
  - `nome`: String
  - `cpf`: String
  - `rg`: String
  - `nacionalidade`: String
  - `estadoCivil`: String
  - `profissao`: String
  - `email`: String
  - `contato`: String
  - `endereco`: String
  - `nascimento`: Date

### Schema em `models/PropostaContrato.js`
  - `nome`: String
  - `email`: String
  - `cpf`: String
  - `autentiqueSignerId`: String
  - `status`: String

### Schema em `models/PropostaContrato.js`
  - `lead`: Mixed (ref Lead)
  - `reserva`: Mixed (ref Reserva)
  - `imovel`: Subdoc
  - `tipoImovel`: String
  - `company`: Mixed (ref Company)
  - `adquirentesSnapshot`: Subdoc
  - `modeloContratoUtilizado`: Mixed (ref ModeloContrato)
  - `autentiqueDocumentId`: String
  - `signatarios`: Array<signatarioSchema>
  - `statusAssinatura`: String
  - `precoTabelaUnidadeNoMomento`: Number
  - `valorPropostaContrato`: Number
  - `valorDescontoConcedido`: Number
  - `valorEntrada`: Number
  - `condicoesPagamentoGerais`: String
  - `dadosBancariosParaPagamento`: dadosBancariosSchema
  - `planoDePagamento`: Array<parcelaSchema>
  - `corretagem`: corretagemSchema
  - `regrasDeReajuste`: Array<regraReajusteSchema>
  - `corpoContratoHTMLGerado`: String
  - `dataProposta`: Date
  - `dataAssinaturaCliente`: Date
  - `dataVendaEfetivada`: Date
  - `statusPropostaContrato`: String
  - `responsavelNegociacao`: Mixed (ref User)
  - `createdBy`: Mixed (ref User)
  - `observacoesInternasProposta`: String
  - `dataDistrato`: Date
  - `motivoDistrato`: String

### Schema em `models/Reserva.js`
  - `lead`: Mixed (ref Lead)
  - `imovel`: Subdoc
  - `tipoImovel`: String
  - `company`: Mixed (ref Company)
  - `dataReserva`: Date
  - `validadeReserva`: Date
  - `valorSinal`: Number
  - `observacoesReserva`: String
  - `statusReserva`: String
  - `createdBy`: Mixed (ref User)
  - `propostaId`: Mixed (ref Proposta)
  - `vendaId`: Mixed (ref Venda)

### Schema em `models/Task.js`
  - `title`: String
  - `description`: String
  - `status`: String
  - `dueDate`: Date
  - `lead`: Mixed (ref Lead)
  - `assignedTo`: Mixed (ref User)
  - `company`: Mixed (ref Company)
  - `createdBy`: Mixed (ref User)

### Schema em `models/Transacao.js`
  - `parcela`: Mixed (ref Parcela)
  - `contrato`: Mixed (ref PropostaContrato)
  - `sacado`: Mixed (ref Lead)
  - `company`: Mixed (ref Company)
  - `valor`: Number
  - `metodoPagamento`: String
  - `dataTransacao`: Date
  - `registradoPor`: Mixed (ref User)
  - `comprovanteUrl`: String

### Schema em `models/Unidade.js`
  - `empreendimento`: Mixed (ref Empreendimento)
  - `identificador`: String
  - `tipologia`: String
  - `areaUtil`: Number
  - `areaTotal`: Number
  - `precoTabela`: Number
  - `statusUnidade`: String
  - `descricao`: String
  - `destaque`: Boolean
  - `company`: Mixed (ref Company)
  - `ativo`: Boolean
  - `currentLeadId`: Mixed (ref Lead)
  - `currentReservaId`: Mixed (ref Reserva)
  - `currentLeadId`: Mixed (ref Lead)
  - `currentReservaId`: Mixed (ref Reserva)

### Schema em `models/User.js`
  - `nome`: String
  - `email`: String
  - `senha`: String
  - `perfil`: String
  - `company`: Mixed (ref Company)
  - `googleId`: String
  - `ativo`: Boolean
  - `googleRefreshToken`: String

