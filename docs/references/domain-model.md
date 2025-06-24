# Modelo de Domínio (MongoDB)

Este documento descreve os principais modelos de dados (schemas Mongoose) utilizados no backend da aplicação CRM Imobiliário.

## 1. Lead (`Lead.js`)

Representa um potencial cliente ou interessado.

*   **Coleção MongoDB:** `leads`

### Campos Principais:

*   `nome`: (String, Obrigatório) Nome completo do lead.
*   `contato`: (String, Obrigatório) Principal telefone de contato do lead. *Validação de formato/unicidade pode ser aplicada no serviço.*
*   `email`: (String) Email do lead.
    *   `unique: true` (para a combinação de email + company)
    *   `sparse: true` (permite múltiplos nulos)
    *   `lowercase: true`, `trim: true`
    *   `match`: Validação de formato de email.
*   `cpf`: (String) CPF do lead.
    *   `unique: true` (para a combinação de cpf + company)
    *   `sparse: true`
*   `rg`: (String) RG do lead.
*   `nacionalidade`: (String, Default: 'Brasileiro(a)') Nacionalidade.
*   `estadoCivil`: (String, Enum: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"]) Estado civil.
*   `profissao`: (String) Profissão do lead.
*   `nascimento`: (Date) Data de nascimento.
*   `endereco`: (String) Endereço completo do lead.
*   `coadquirentes`: (Array de `coadquirenteSchema`) Lista de coadquirentes/compradores adicionais.
    *   **`coadquirenteSchema`**:
        *   `nome`: (String, Obrigatório)
        *   `cpf`, `rg`, `nacionalidade`, `estadoCivil`, `profissao`, `email`, `contato`, `endereco`: (String)
        *   `nascimento`: (Date)
*   `situacao`: (ObjectId, Ref: `LeadStage`, Obrigatório) ID da situação atual do lead no funil de vendas.
*   `motivoDescarte`: (ObjectId, Ref: `DiscardReason`, Default: `null`) ID do motivo pelo qual o lead foi descartado.
*   `comentario`: (String, Default: `null`) Observações gerais sobre o lead.
*   `origem`: (ObjectId, Ref: `Origem`) ID da origem do lead (ex: Website, Indicação).
*   `responsavel`: (ObjectId, Ref: `User`, Obrigatório) ID do usuário do CRM responsável pelo lead.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) ID da empresa à qual o lead pertence.
*   `tags`: (Array de Strings) Tags para categorização (ex: "vip", "investidor"). `trim: true`, `lowercase: true`.
*   `ativo`: (Boolean, Default: `true`) Indica se o lead está ativo. (Este campo não está explicitamente no schema fornecido, mas é uma inferência comum ou pode estar em `LeadService`.)

### Índices:

*   `{ company: 1, contato: 1 }, { unique: true, sparse: true }`
*   `{ company: 1, email: 1 }, { unique: true, sparse: true }`
*   `{ company: 1, cpf: 1 }, { unique: true, sparse: true }` (Inferido pela necessidade de CPF único por empresa)

### Relacionamentos:

*   `situacao` -> `LeadStage`
*   `motivoDescarte` -> `DiscardReason`
*   `origem` -> `Origem`
*   `responsavel` -> `User`
*   `company` -> `Company`

## 2. PropostaContrato (`PropostaContrato.js`)

Representa uma proposta comercial ou um contrato formalizado com um lead para um imóvel.

*   **Coleção MongoDB:** `propostacontratos`

### Sub-Schemas:

*   **`parcelaSchema`**: Define a estrutura de uma parcela do plano de pagamento.
    *   `tipoParcela`: (String, Obrigatório, Enum: ["ATO", "PARCELA MENSAL", ...])
    *   `quantidade`: (Number, Default: 1)
    *   `valorUnitario`: (Number, Obrigatório)
    *   `vencimentoPrimeira`: (Date, Obrigatório)
    *   `observacao`: (String)
*   **`dadosBancariosSchema`**: Informações bancárias para pagamento.
    *   `bancoNome`, `agencia`, `operacao`, `contaCorrente`, `cnpjPagamento`, `pix`: (String)
*   **`corretagemSchema`**: Detalhes da comissão de corretagem.
    *   `valorCorretagem`: (Number, Obrigatório)
    *   `corretorPrincipal`: (ObjectId, Ref: `BrokerContact`)
    *   `corretoresEnvolvidos`: (Array de Objetos) `{ brokerContactId: ObjectId, percentualComissao: Number }`
    *   `condicoesPagamentoCorretagem`: (String)
    *   `observacoesCorretagem`: (String)
*   **`adquirenteSnapshotSchema`**: Snapshot dos dados dos adquirentes no momento da criação/atualização da proposta. Estrutura similar ao `coadquirenteSchema` do `Lead`.
    *   `nome`: (String, Obrigatório)
    *   `cpf`, `rg`, `nacionalidade`, `estadoCivil`, `profissao`, `email`, `contato`, `endereco`: (String)
    *   `nascimento`: (Date)

### Campos Principais:

*   `lead`: (ObjectId, Ref: `Lead`, Obrigatório, Indexado) Lead associado.
*   `reserva`: (ObjectId, Ref: `Reserva`, Obrigatório, Único, Indexado) Reserva que originou a proposta.
*   `imovel`: (ObjectId, Obrigatório, `refPath: 'tipoImovel'`) Imóvel objeto da proposta (polimórfico).
*   `tipoImovel`: (String, Obrigatório, Enum: ['Unidade', 'ImovelAvulso']) Define a coleção referenciada por `imovel`.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa.
*   `adquirentesSnapshot`: (Array de `adquirenteSnapshotSchema`, Obrigatório) Dados dos compradores.
*   `modeloContratoUtilizado`: (ObjectId, Ref: `ModeloContrato`) Modelo de contrato usado para gerar o documento.
*   `precoTabelaUnidadeNoMomento`: (Number, Obrigatório) Preço do imóvel no momento da proposta.
*   `valorPropostaContrato`: (Number, Obrigatório) Valor total negociado.
*   `valorDescontoConcedido`: (Number, Default: 0) Calculado automaticamente (`precoTabelaUnidadeNoMomento` - `valorPropostaContrato`).
*   `valorEntrada`: (Number) Valor do sinal/entrada.
*   `condicoesPagamentoGerais`: (String) Descrição das condições de pagamento.
*   `dadosBancariosParaPagamento`: (`dadosBancariosSchema`)
*   `planoDePagamento`: (Array de `parcelaSchema`) Detalhamento das parcelas.
*   `corretagem`: (`corretagemSchema`) Informações de corretagem.
*   `corpoContratoHTMLGerado`: (String, Obrigatório) Conteúdo HTML do contrato gerado/editado.
*   `dataProposta`: (Date, Default: `Date.now`) Data da criação da proposta.
*   `dataAssinaturaCliente`: (Date) Data da assinatura pelo cliente.
*   `dataVendaEfetivada`: (Date) Data da efetivação da venda.
*   `statusPropostaContrato`: (String, Obrigatório, Enum: ["Em Elaboração", "Aguardando Aprovações", ..., "Distrato Realizado"], Default: "Em Elaboração", Indexado) Status atual.
*   `responsavelNegociacao`: (ObjectId, Ref: `User`, Obrigatório) Usuário responsável pela negociação.
*   `createdBy`: (ObjectId, Ref: `User`, Obrigatório) Usuário que criou a proposta.
*   `observacoesInternasProposta`: (String)
*   `dataDistrato`: (Date)
*   `motivoDistrato`: (String)

### Hooks (`pre('save')`):

*   Cálculo automático de `valorDescontoConcedido`.
*   Validação do somatório do `planoDePagamento` + `valorEntrada` contra `valorPropostaContrato` (com tolerância). Pode ser bypassado com `this.$ignoreValidacaoParcelas = true`.
*   `corretagemSchema.pre('validate')`: Valida se a soma dos percentuais de comissão dos corretores envolvidos não excede 100%.

### Relacionamentos:

*   `lead` -> `Lead`
*   `reserva` -> `Reserva`
*   `imovel` -> `Unidade` ou `ImovelAvulso` (polimórfico)
*   `company` -> `Company`
*   `modeloContratoUtilizado` -> `ModeloContrato`
*   `corretagem.corretorPrincipal` -> `BrokerContact`
*   `corretagem.corretoresEnvolvidos[].brokerContactId` -> `BrokerContact`
*   `responsavelNegociacao` -> `User`
*   `createdBy` -> `User`

## 3. Reserva (`Reserva.js`)

Representa a reserva de um imóvel por um lead por um período determinado.

*   **Coleção MongoDB:** `reservas`

### Campos Principais:

*   `lead`: (ObjectId, Ref: `Lead`, Obrigatório, Indexado) Lead que fez a reserva.
*   `imovel`: (ObjectId, Obrigatório, `refPath: 'tipoImovel'`) Imóvel reservado.
*   `tipoImovel`: (String, Obrigatório, Enum: ['Unidade', 'ImovelAvulso']) Define a coleção de `imovel`.
*   `company`: (ObjectId, Ref: `Company`, Indexado) Empresa (setado via hook `pre('save')` com base no `lead.company`).
*   `dataReserva`: (Date, Obrigatório, Default: `Date.now`) Data em que a reserva foi feita.
*   `validadeReserva`: (Date, Obrigatório) Data até quando a reserva é válida.
*   `valorSinal`: (Number, Min: 0) Valor pago como sinal para a reserva.
*   `observacoesReserva`: (String)
*   `statusReserva`: (String, Obrigatório, Enum: ["Pendente", "Ativa", "Expirada", "Cancelada", "ConvertidaEmProposta", "ConvertidaEmVenda", "Distratada"], Default: "Ativa", Indexado) Status da reserva.
*   `createdBy`: (ObjectId, Ref: `User`, Obrigatório) Usuário que criou a reserva.
*   `propostaId`: (ObjectId, Ref: `PropostaContrato`) ID da proposta gerada a partir desta reserva. (No schema do modelo está `ref: 'Proposta'`, deve ser `PropostaContrato`)
*   `vendaId`: (ObjectId, Ref: `Venda`) (Modelo `Venda` não fornecido, mas referenciado).

### Índices:

*   `{ imovel: 1, statusReserva: 1 }, { unique: true, partialFilterExpression: { statusReserva: "Ativa" }, name: "imovel_statusReserva_ativa_unique_idx" }`: Garante que só pode haver uma reserva "Ativa" por imóvel.

### Hooks (`pre('save')`):

*   Se `isNew`:
    *   Valida e define `this.company` com base no `this.lead.company`.
    *   Se `statusReserva` for "Ativa" e `tipoImovel` for "Unidade", valida se a unidade referenciada está com status "Disponível".

### Relacionamentos:

*   `lead` -> `Lead`
*   `imovel` -> `Unidade` ou `ImovelAvulso` (polimórfico)
*   `company` -> `Company`
*   `createdBy` -> `User`
*   `propostaId` -> `PropostaContrato`
*   `vendaId` -> `Venda` (modelo não fornecido)

---
*(Fim da documentação dos modelos principais.)*

## 7. User (`User.js`)

Representa um usuário do sistema CRM (administrador, corretor).

*   **Coleção MongoDB:** `users`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim) Nome do usuário.
*   `email`: (String, Obrigatório, Único globalmente, Lowercase, Trim, Match: formato de email) Email de login.
*   `senha`: (String, Select: `false`) Hash da senha (não retornado por padrão).
*   `perfil`: (String, Obrigatório, Enum: ['admin', 'corretor'], Default: 'corretor') Perfil de acesso do usuário.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório) Empresa à qual o usuário pertence.
*   `googleId`: (String, Único globalmente, Sparse, Indexado) ID do usuário no Google (para login social).
*   `ativo`: (Boolean, Default: `true`) Se o usuário está ativo.
*   `googleRefreshToken`: (String, Select: `false`) Refresh token do Google para acesso offline a APIs.

### Hooks:

*   `post('save')`: Trata erros de duplicidade para `email` e `googleId`.
*   `pre('save')`: Gera hash da `senha` se ela for modificada e existir.

### Métodos:

*   `matchPassword(enteredPassword)`: Compara uma senha fornecida com o hash armazenado.

### Relacionamentos:

*   `company` -> `Company`

## 8. Company (`Company.js`)

Representa uma empresa (construtora, imobiliária) que utiliza o sistema CRM.

*   **Coleção MongoDB:** `companies`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim) Nome da empresa.
*   `cnpj`: (String, Obrigatório, Único) CNPJ da empresa.
    *   `validate`: Valida o formato do CNPJ.
    *   `set`: Remove caracteres não numéricos.
*   `ativo`: (Boolean, Default: `true`) Se a empresa está ativa.
*   `facebookPageId`: (String, Trim, Indexado, Único, Sparse) ID da Página do Facebook conectada.
*   `linkedFacebookForms`: (Array de Objetos) Formulários do Facebook Lead Ads vinculados.
    *   `formId`: (String, Obrigatório)
    *   `formName`: (String)
*   `facebookConnectedByUserId`: (ObjectId, Ref: `User`) Usuário que conectou a página do Facebook.
*   `facebookWebhookSubscriptionId`: (String) ID da inscrição do webhook do Facebook.

### Hooks:

*   `post('save')`: Trata erros de duplicidade para `cnpj` e `facebookPageId`.
*   `post('findOneAndUpdate')`: Trata erro de duplicidade para `cnpj` ao atualizar.

### Relacionamentos:

*   `facebookConnectedByUserId` -> `User`
*   (Implícito) `User`, `Lead`, `Empreendimento`, etc. -> `Company` (através do campo `company` nesses modelos)

## 9. LeadStage (`LeadStage.js`)

Representa um estágio no funil de vendas de leads (ex: Novo, Em Contato, Qualificado).

*   **Coleção MongoDB:** `leadstages`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim) Nome do estágio.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa à qual o estágio pertence.
*   `ativo`: (Boolean, Default: `true`) Se o estágio está ativo.
*   `ordem`: (Number, Default: 0) Ordem de exibição do estágio no funil/Kanban.

### Índices:

*   `{ company: 1, nome: 1 }, { unique: true }`
*   `{ company: 1, ordem: 1 }`

### Hooks:

*   `post('save')` e `post('findOneAndUpdate')`: Tratam erros de duplicidade de `nome` por `company`.

### Relacionamentos:

*   `company` -> `Company`

## 10. Origem (`origem.js`)

Representa a origem de um lead (ex: Website, Indicação, Facebook).

*   **Coleção MongoDB:** `origens`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim) Nome da origem.
*   `descricao`: (String) Descrição opcional da origem.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa à qual a origem pertence.
*   `ativo`: (Boolean, Default: `true`) Se a origem está ativa.

### Índices:

*   `{ company: 1, nome: 1 }, { unique: true }`

### Hooks:

*   `post('save')` e `post('findOneAndUpdate')`: Tratam erros de duplicidade de `nome` por `company`.

### Relacionamentos:

*   `company` -> `Company`

## 11. DiscardReason (`DiscardReason.js`)

Representa um motivo pelo qual um lead pode ser descartado.

*   **Coleção MongoDB:** `discardreasons`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim) Nome do motivo de descarte.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa à qual o motivo pertence.
*   `ativo`: (Boolean, Default: `true`) Se o motivo está ativo.

### Índices:

*   `{ company: 1, nome: 1 }, { unique: true }`

### Hooks:

*   `post('save')`: Trata erro de duplicidade de `nome` por `company`.

### Relacionamentos:

*   `company` -> `Company`

## 12. ModeloContrato (`ModeloContrato.js`)

Representa um template de contrato que pode ser usado para gerar documentos para propostas.

*   **Coleção MongoDB:** `modelocontratos`

### Campos Principais:

*   `nomeModelo`: (String, Obrigatório, Trim) Nome do modelo.
*   `tipoDocumento`: (String, Obrigatório, Enum: ["Proposta", "Contrato de Reserva", "Contrato de Compra e Venda", "Outro"], Default: "Contrato de Compra e Venda") Tipo do documento que este modelo representa.
*   `conteudoHTMLTemplate`: (String, Obrigatório) Conteúdo HTML do modelo, com placeholders (ex: `{{lead_nome}}`).
*   `placeholdersDisponiveis`: (Array de Objetos) Lista informativa de placeholders usados no template.
    *   `placeholder`: (String) Ex: `{{lead_nome}}`
    *   `descricao`: (String) Ex: "Nome completo do lead principal"
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa à qual o modelo pertence.
*   `ativo`: (Boolean, Default: `true`) Se o modelo está ativo.

### Índices:

*   `{ nomeModelo: 1, company: 1 }, { unique: true }`

### Relacionamentos:

*   `company` -> `Company`

## 13. BrokerContact (`BrokerContact.js`)

Representa um contato de corretor ou imobiliária parceira.

*   **Coleção MongoDB:** `brokercontacts`

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim, Indexado) Nome do corretor ou imobiliária.
*   `contato`: (String, Trim) Telefone de contato.
*   `email`: (String, Trim, Lowercase, Único por empresa, Sparse, Match: formato de email) Email do contato.
*   `creci`: (String, Trim, Indexado) CRECI do corretor/imobiliária. Único por empresa se fornecido.
*   `nomeImobiliaria`: (String) Nome da imobiliária (se for um corretor vinculado).
*   `cpfCnpj`: (String, Trim) CPF ou CNPJ do contato.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa que cadastrou este contato parceiro.
*   `ativo`: (Boolean, Default: `true`) Se o contato está ativo.

### Índices:

*   `{ company: 1, creci: 1 }, { unique: true, sparse: true }`
*   `{ company: 1, email: 1 }, { unique: true, sparse: true }`

### Relacionamentos:

*   `company` -> `Company`

## 14. LeadHistory (`LeadHistory.js`)

Registra o histórico de ações e alterações importantes relacionadas a um `Lead`.

*   **Coleção MongoDB:** `leadhistoires` (Nota: o nome da coleção provavelmente será `leadhistoires` ou `leadhistories` devido à pluralização do Mongoose, não `leadhistoires` como no exemplo, mas o modelo é `LeadHistory`).

### Campos Principais:

*   `lead`: (ObjectId, Ref: `Lead`, Obrigatório, Indexado) O lead ao qual este registro de histórico pertence.
*   `user`: (ObjectId, Ref: `User`, Default: `null`) O usuário do sistema que realizou a ação. Pode ser `null` para ações automáticas do sistema.
*   `action`: (String, Obrigatório, Enum: ["CRIACAO", "ATUALIZACAO", "DESCARTE", ...]) Tipo da ação realizada. A lista de `enum` é extensa e cobre diversas operações do sistema.
*   `details`: (String, Default: "") Detalhes adicionais sobre a ação. Pode incluir informações como "De: X, Para: Y".
*   `createdAt`, `updatedAt`: (Timestamps) Datas de criação e atualização do registro de histórico.

### Relacionamentos:

*   `lead` -> `Lead`
*   `user` -> `User`

---
*(Fim da documentação dos modelos.)*

## 4. Unidade (`Unidade.js`)

Representa uma unidade individual dentro de um `Empreendimento` (ex: apartamento, casa em condomínio, lote).

*   **Coleção MongoDB:** `unidades`

### Campos Principais:

*   `empreendimento`: (ObjectId, Ref: `Empreendimento`, Obrigatório, Indexado) ID do empreendimento ao qual a unidade pertence.
*   `identificador`: (String, Obrigatório, Trim) Identificador único da unidade dentro do empreendimento (ex: "Apto 101", "Lote B27").
*   `tipologia`: (String, Trim) Descrição da tipologia (ex: "2 Quartos com Suíte", "Cobertura Duplex").
*   `areaUtil`: (Number, Min: 0) Área útil em m².
*   `areaTotal`: (Number, Min: 0) Área total em m².
*   `precoTabela`: (Number, Min: 0) Preço de tabela da unidade.
*   `statusUnidade`: (String, Obrigatório, Enum: ["Disponível", "Reservada", "Proposta", "Vendido", "Bloqueado"], Default: "Disponível") Status atual da unidade.
*   `observacoesInternas`: (String, Trim)
*   `destaque`: (Boolean, Default: `false`) Se a unidade deve ser destacada.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) ID da empresa (herdado do empreendimento via hook `pre('save')`).
*   `ativo`: (Boolean, Default: `true`) Se a unidade está ativa no sistema.
*   `currentLeadId`: (ObjectId, Ref: `Lead`, Default: `null`, Indexado, Sparse) ID do lead atualmente associado à unidade (ex: em uma reserva ou proposta).
*   `currentReservaId`: (ObjectId, Ref: `Reserva`, Default: `null`, Único, Sparse) ID da reserva ativa para esta unidade.

### Índices:

*   `{ empreendimento: 1, identificador: 1 }, { unique: true }`: Garante que o `identificador` é único por `empreendimento`.

### Hooks (`pre('save')`):

*   Se `isNew` ou `empreendimento` modificado:
    *   Busca o `Empreendimento` pai.
    *   Define `this.company` com o `companyId` do empreendimento pai.
    *   Lança erro se o empreendimento pai não for encontrado.

### Relacionamentos:

*   `empreendimento` -> `Empreendimento`
*   `company` -> `Company`
*   `currentLeadId` -> `Lead`
*   `currentReservaId` -> `Reserva`

## 5. Imóvel Avulso (`ImovelAvulso.js`)

Representa um imóvel que não faz parte de um `Empreendimento` maior (ex: casa usada, terreno particular).

*   **Coleção MongoDB:** `imovelavulsos`

### Sub-Schemas:

*   **`enderecoSchema`**: Define a estrutura do endereço.
    *   `logradouro`, `numero`, `complemento`, `bairro` (Indexado), `cep`: (String, Trim)
    *   `cidade`: (String, Obrigatório, Trim, Indexado)
    *   `uf`: (String, Obrigatório, Trim, Maxlength: 2)
*   **`fotosSchema`** (implícito no array `fotos`):
    *   `url`: (String, Obrigatório)
    *   `descricao`: (String)

### Campos Principais:

*   `titulo`: (String, Obrigatório, Trim) Título descritivo do imóvel (ex: "Casa 3 Quartos com Piscina no Bairro X").
*   `descricao`: (String, Trim) Descrição detalhada do imóvel.
*   `tipoImovel`: (String, Obrigatório, Enum: ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro'], Indexado) Tipo do imóvel.
*   `status`: (String, Obrigatório, Enum: ['Disponível', 'Reservado', 'Vendido', 'Inativo', 'Proposta'], Default: 'Disponível', Indexado) Status atual do imóvel.
*   `quartos`: (Number, Default: 0)
*   `suites`: (Number, Default: 0)
*   `banheiros`: (Number, Default: 0)
*   `vagasGaragem`: (Number, Default: 0)
*   `areaTotal`: (Number, Obrigatório) Área total em m².
*   `preco`: (Number, Obrigatório) Preço do imóvel.
*   `endereco`: (`enderecoSchema`)
*   `fotos`: (Array de Objetos `{ url: String, descricao: String }`) Lista de fotos do imóvel.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa responsável pelo imóvel.
*   `responsavel`: (ObjectId, Ref: `User`, Obrigatório) Corretor/usuário responsável pelo imóvel.
*   `currentLeadId`: (ObjectId, Ref: `Lead`, Default: `null`) ID do lead atualmente associado (reserva/proposta).
*   `currentReservaId`: (ObjectId, Ref: `Reserva`, Default: `null`) ID da reserva ativa para este imóvel.

### Índices:

*   `{ company: 1, tipoImovel: 1, status: 1 }`

### Relacionamentos:

*   `company` -> `Company`
*   `responsavel` -> `User`
*   `currentLeadId` -> `Lead`
*   `currentReservaId` -> `Reserva`

## 6. Empreendimento (`Empreendimento.js`)

Representa um projeto imobiliário maior, que pode conter múltiplas `Unidades`.

*   **Coleção MongoDB:** `empreendimentos`

### Sub-Schemas:

*   **`localizacaoSchema`**: Define a estrutura da localização do empreendimento.
    *   `logradouro`, `numero`, `bairro`, `cep`, `latitude`, `longitude`: (String, Trim)
    *   `cidade`: (String, Trim, Obrigatório)
    *   `uf`: (String, Trim, Uppercase, Minlength: 2, Maxlength: 2, Obrigatório)
*   **`imagemSchema`**: Define a estrutura para imagens.
    *   `url`: (String) URL da imagem.
    *   `thumbnailUrl`: (String) URL da miniatura.
    *   `altText`: (String, Trim) Texto alternativo para a imagem.

### Campos Principais:

*   `nome`: (String, Obrigatório, Trim, Indexado) Nome do empreendimento.
*   `construtoraIncorporadora`: (String, Trim) Nome da construtora/incorporadora.
*   `localizacao`: (`localizacaoSchema`)
*   `tipo`: (String, Obrigatório, Enum: ["Residencial Vertical", "Residencial Horizontal", "Loteamento", "Comercial"]) Tipo do empreendimento.
*   `statusEmpreendimento`: (String, Obrigatório, Enum: ["Em Planejamento", "Breve Lançamento", ..., "Concluído"], Default: "Em Planejamento") Status atual do empreendimento.
*   `descricao`: (String, Trim) Descrição do empreendimento.
*   `imagemPrincipal`: (`imagemSchema`) Imagem principal de divulgação.
*   `dataPrevistaEntrega`: (Date) Data prevista para a entrega do empreendimento.
*   `company`: (ObjectId, Ref: `Company`, Obrigatório, Indexado) Empresa proprietária do empreendimento.
*   `ativo`: (Boolean, Default: `true`) Se o empreendimento está ativo no sistema.

### Índices:

*   `{ nome: 1, company: 1 }, { unique: true }`: Garante que o nome do empreendimento é único por empresa.

### Campos Virtuais:

*   `totalUnidades`: (Number) Conta o número de `Unidades` associadas a este empreendimento.
    *   `ref: 'Unidade'`
    *   `localField: '_id'`
    *   `foreignField: 'empreendimento'`
    *   `count: true`

### Relacionamentos:

*   `company` -> `Company`
*   (Implícito) `Unidade` -> `Empreendimento` (através do campo `empreendimento` no modelo `Unidade`)

---
*(Mais modelos serão adicionados abaixo: Unidade, ImovelAvulso, Empreendimento, etc.)*
