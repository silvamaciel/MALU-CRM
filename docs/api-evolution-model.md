# Modelo de API - Evolution API para CRM Imobiliário

Este documento descreve o modelo proposto para a Evolution API do sistema CRM Imobiliário, com foco na organização por módulos funcionais, endpoints REST, payloads e fluxos de uso.

## Princípios Gerais

*   **RESTful:** A API segue os princípios REST.
*   **JSON:** Os dados são transacionados primariamente em formato JSON.
*   **Autenticação:** Baseada em Token JWT. O token deve ser enviado no header `Authorization: Bearer <token>`.
*   **Identificadores:** `ObjectId` do MongoDB são usados para referenciar recursos.
*   **Versionamento:** (Não abordado neste modelo inicial, mas considerar `v1` no path, ex: `/api/v1/leads`).
*   **Paginação:** Endpoints de listagem (`GET` em coleções) devem suportar paginação via query params (`page`, `limit`).
*   **Filtragem e Ordenação:** Endpoints de listagem devem suportar filtros e ordenação via query params.
*   **Company Scope:** A maioria dos recursos é escopada pela `companyId` do usuário autenticado. Essa informação é geralmente inferida no backend.

---

## 1. Leads

Gerencia informações e interações com potenciais clientes.

*   **API Base Path:** `/leads`

### Endpoints:

*   #### `GET /leads`
    *   **Descrição:** Lista todos os leads da empresa, com filtros e paginação.
    *   **Fluxo CRM:** Usado para visualizar a base de leads, filtrar por diferentes critérios (situação, origem, responsável), popular funis de venda, dashboards e relatórios.
    *   **Parâmetros de Query:**
        *   `page` (Number, Opcional): Número da página para paginação.
        *   `limit` (Number, Opcional): Quantidade de itens por página.
        *   `sortBy` (String, Opcional): Campo para ordenação (ex: `nome`, `createdAt`).
        *   `sortOrder` (String, Opcional, Enum: `asc`, `desc`): Ordem da ordenação.
        *   `nome` (String, Opcional): Filtrar por nome do lead (parcial).
        *   `email` (String, Opcional): Filtrar por email do lead.
        *   `contato` (String, Opcional): Filtrar por telefone de contato.
        *   `cpf` (String, Opcional): Filtrar por CPF do lead.
        *   `situacaoId` (ObjectId, Opcional): Filtrar por ID da situação do lead (`LeadStage`).
        *   `origemId` (ObjectId, Opcional): Filtrar por ID da origem do lead.
        *   `responsavelId` (ObjectId, Opcional): Filtrar por ID do usuário responsável.
        *   `tags` (String, Opcional): Filtrar por tags (ex: `vip,investidor` - buscar leads com ambas as tags).
        *   `dataCriacaoInicio` (ISO Date, Opcional): Filtrar por data de criação inicial.
        *   `dataCriacaoFim` (ISO Date, Opcional): Filtrar por data de criação final.

*   #### `POST /leads`
    *   **Descrição:** Cria um novo lead para a empresa.
    *   **Fluxo CRM:** Usado ao cadastrar manualmente um novo lead que entrou em contato por telefone, e-mail direto, evento presencial, ou importado de outras fontes não automatizadas.
    *   **Payload (application/json):**
        ```json
        {
          "nome": "Nome Completo do Lead", // Obrigatório
          "contato": "+5511999998888", // Obrigatório (telefone principal)
          "email": "lead@example.com", // Opcional, mas recomendado
          "cpf": "12345678900", // Opcional
          "rg": "123456789", // Opcional
          "nacionalidade": "Brasileiro(a)", // Opcional
          "estadoCivil": "Solteiro(a)", // Opcional, Enum: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"]
          "profissao": "Engenheiro", // Opcional
          "nascimento": "1990-01-15", // Opcional (ISO Date string, ex: YYYY-MM-DD)
          "endereco": "Rua Exemplo, 123, Bairro, Cidade - UF", // Opcional
          "coadquirentes": [ // Opcional
            {
              "nome": "Nome Coadquirente 1", // Obrigatório dentro do objeto coadquirente
              "cpf": "09876543211",
              "email": "coad1@example.com",
              // ... outros campos do coadquirenteSchema (rg, nacionalidade, etc.)
            }
          ],
          "situacao": "ObjectId_do_LeadStage_Inicial", // Obrigatório (ID de LeadStage)
          "origem": "ObjectId_da_Origem_do_Lead", // Obrigatório (ID de Origem)
          "responsavel": "ObjectId_do_Usuario_Responsavel", // Obrigatório (ID de User)
          "comentario": "Primeiro contato via indicação em 10/10/2023.", // Opcional
          "tags": ["vip", "interesse_imediato"] // Opcional (array de strings)
          // companyId é inferido no backend a partir do usuário autenticado
        }
        ```

*   #### `GET /leads/{leadId}`
    *   **Descrição:** Obtém os detalhes de um lead específico pelo seu `ObjectId`.
    *   **Fluxo CRM:** Usado para visualizar informações detalhadas de um lead ao preparar um contato, analisar seu histórico, verificar dados para uma proposta, ou integrar com outras ferramentas.

*   #### `PUT /leads/{leadId}`
    *   **Descrição:** Atualiza os detalhes de um lead específico. Enviar apenas os campos que devem ser modificados.
    *   **Fluxo CRM:** Usado após um contato com o lead para atualizar suas informações cadastrais, mudar sua situação no funil de vendas, adicionar/remover coadquirentes, registrar novas observações, etc.
    *   **Payload (application/json):** (Campos são opcionais, enviar apenas o que mudou)
        ```json
        {
          "nome": "Nome Completo Atualizado do Lead",
          "email": "novo_email_lead@example.com",
          "contato": "+5511988887777",
          "situacao": "ObjectId_do_Novo_LeadStage", // Ex: Movido para "Em Negociação"
          "motivoDescarte": "ObjectId_do_Motivo_Descarte", // Apenas se o lead for descartado
          "comentario": "Lead demonstrou interesse em unidades de 3 quartos.",
          "coadquirentes": [ /* ... lista completa e atualizada de coadquirentes ... */ ],
          "tags": ["vip", "pronto_para_comprar"]
          // ... quaisquer outros campos do lead que podem ser atualizados
        }
        ```

*   #### `DELETE /leads/{leadId}`
    *   **Descrição:** "Desativa" um lead (soft delete). O lead não é permanentemente removido, mas marcado como inativo. Uma alternativa pode ser `PATCH /leads/{leadId}/archive`.
    *   **Fluxo CRM:** Usado para remover leads duplicados, inválidos, ou que explicitamente solicitaram não ser mais contatados, mantendo o histórico para conformidade ou análise futura.

*   #### `POST /leads/importar-csv`
    *   **Descrição:** Importa leads em lote a partir de um arquivo CSV.
    *   **Fluxo CRM:** Usado para cadastrar em massa leads provenientes de listas externas, planilhas de eventos, feiras, ou migração de outros sistemas. Requer permissão de administrador.
    *   **Payload (multipart/form-data):**
        *   Campo `csvfile`: O arquivo CSV contendo os leads.

*   #### `GET /leads/csv-template`
    *   **Descrição:** Baixa o arquivo CSV modelo para a importação de leads.
    *   **Fluxo CRM:** Primeiro passo para o usuário que deseja importar leads via CSV, garantindo que o arquivo esteja no formato esperado pelo sistema.

---

## 2. Reservas

Gerencia o processo de reserva de um imóvel por um lead.

*   **API Base Path:** `/reservas`

### Endpoints:

*   #### `GET /reservas`
    *   **Descrição:** Lista todas as reservas da empresa, com filtros e paginação.
    *   **Fluxo CRM:** Usado para visualizar imóveis atualmente reservados, acompanhar validades de reserva, identificar reservas próximas da expiração para follow-up, ou gerar relatórios de ocupação.
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `leadId` (ObjectId, Opcional): Filtrar por lead.
        *   `imovelId` (ObjectId, Opcional): Filtrar por ID do imóvel (Unidade ou ImovelAvulso).
        *   `tipoImovel` (String, Opcional, Enum: `Unidade`, `ImovelAvulso`): Filtrar pelo tipo do imóvel.
        *   `statusReserva` (String, Opcional, Enum: `Pendente`, `Ativa`, `Expirada`, `Cancelada`, `ConvertidaEmProposta`): Filtrar por status.
        *   `dataReservaInicio` (ISO Date, Opcional): Filtrar por data de início da reserva.
        *   `dataReservaFim` (ISO Date, Opcional): Filtrar por data de fim da reserva.
        *   `validadeReservaInicio` (ISO Date, Opcional): Filtrar por data de início da validade.
        *   `validadeReservaFim` (ISO Date, Opcional): Filtrar por data de fim da validade.

*   #### `POST /reservas`
    *   **Descrição:** Cria uma nova reserva para um imóvel em nome de um lead.
    *   **Fluxo CRM:** Usado quando um lead demonstra interesse firme em um imóvel específico e deseja garantir sua disponibilidade por um período determinado, muitas vezes mediante o pagamento de um sinal. A criação de uma reserva geralmente muda o status do imóvel para "Reservada".
    *   **Payload (application/json):**
        ```json
        {
          "lead": "ObjectId_do_Lead_que_esta_reservando", // Obrigatório
          "imovel": "ObjectId_do_Imovel_a_ser_reservado", // Obrigatório (Unidade ou ImovelAvulso)
          "tipoImovel": "Unidade", // Obrigatório, Enum: ['Unidade', 'ImovelAvulso']
          "validadeReserva": "2024-12-31T23:59:59Z", // Obrigatório (Data e hora ISO até quando a reserva é válida)
          "valorSinal": 5000.00, // Opcional (Valor pago como sinal para a reserva)
          "observacoesReserva": "Cliente solicitou reserva até o final do mês para análise de crédito." // Opcional
          // companyId é inferido pelo lead.company ou usuário.
          // createdBy é inferido pelo usuário autenticado.
          // statusReserva por padrão é "Ativa" ou "Pendente" dependendo da regra de negócio (ex: aguardando confirmação de pagamento do sinal).
        }
        ```

*   #### `GET /reservas/{reservaId}`
    *   **Descrição:** Obtém os detalhes de uma reserva específica.
    *   **Fluxo CRM:** Usado para consultar os termos de uma reserva existente, verificar sua validade, dados do lead e do imóvel, ou como ponto de partida para converter a reserva em uma proposta/contrato.

*   #### `PUT /reservas/{reservaId}`
    *   **Descrição:** Atualiza os detalhes de uma reserva existente (ex: estender validade, adicionar observações, confirmar pagamento de sinal).
    *   **Fluxo CRM:** Usado para modificar uma reserva, como prorrogar sua validade após negociação com o lead, ou registrar informações adicionais.
    *   **Payload (application/json):** (Campos são opcionais, enviar apenas o que mudou)
        ```json
        {
          "validadeReserva": "2025-01-15T23:59:59Z", // Nova data de validade
          "valorSinal": 5500.00, // Ex: atualização se houve complemento
          "observacoesReserva": "Validade estendida conforme acordo. Sinal complementar recebido.",
          "statusReserva": "Ativa" // Ex: Mudar de "Pendente" para "Ativa" após confirmação.
        }
        ```

*   #### `PATCH /reservas/{reservaId}/cancelar`
    *   **Descrição:** Cancela uma reserva ativa ou pendente.
    *   **Fluxo CRM:** Usado quando o lead desiste da reserva, não cumpre os requisitos para mantê-la (ex: não pagamento do sinal no prazo), ou a reserva é cancelada por outros motivos. Isso deve liberar o imóvel, mudando seu status de volta para "Disponível".
    *   **Payload (application/json):** (Opcional, para registrar motivo do cancelamento)
        ```json
        {
          "motivoCancelamento": "Lead desistiu da compra devido a contraproposta de outra imobiliária." // Opcional
        }
        ```

*   #### `PATCH /reservas/{reservaId}/expirar`
    *   **Descrição:** Marca uma reserva como expirada.
    *   **Fluxo CRM:** Geralmente uma ação automática executada pelo sistema quando a `validadeReserva` é ultrapassada e a reserva não foi convertida em proposta/venda nem cancelada. Também libera o imóvel.

---

## 3. Propostas/Contratos

Gerencia propostas comerciais e contratos formais.

*   **API Base Path:** `/propostas-contratos`

### Endpoints:

*   #### `GET /propostas-contratos`
    *   **Descrição:** Lista todas as propostas/contratos da empresa, com filtros e paginação.
    *   **Fluxo CRM:** Usado para acompanhar o status das negociações em andamento, visualizar propostas em elaboração, aguardando aprovações internas/cliente, assinadas, ou já convertidas em venda efetivada. Essencial para gestão de vendas e pipeline.
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `leadId` (ObjectId, Opcional): Filtrar por lead.
        *   `reservaId` (ObjectId, Opcional): Filtrar pela reserva que originou a proposta.
        *   `imovelId` (ObjectId, Opcional): Filtrar pelo imóvel objeto da proposta.
        *   `tipoImovel` (String, Opcional, Enum: `Unidade`, `ImovelAvulso`): Filtrar pelo tipo do imóvel.
        *   `statusPropostaContrato` (String, Opcional, Enum: `Em Elaboração`, `Aguardando Aprovações`, `Aprovada`, `Rejeitada`, `Aguardando Assinatura Cliente`, `Assinada`, `Venda Efetivada`, `Distrato Realizado`): Filtrar por status.
        *   `responsavelNegociacaoId` (ObjectId, Opcional): Filtrar pelo usuário do CRM responsável.
        *   `dataCriacaoInicio` (ISO Date, Opcional): Filtrar por data de criação inicial.
        *   `dataCriacaoFim` (ISO Date, Opcional): Filtrar por data de criação final.

*   #### `POST /propostas-contratos/a-partir-da-reserva/{reservaId}`
    *   **Descrição:** Cria uma nova proposta/contrato a partir de uma reserva (`reservaId`) existente e ativa.
    *   **Fluxo CRM:** Passo crucial após uma reserva ser confirmada. Formaliza a intenção de compra com todas as condições financeiras, plano de pagamento, dados dos adquirentes, e informações de corretagem. Ao criar a proposta, a reserva é marcada como "ConvertidaEmProposta" e o imóvel como "Proposta".
    *   **Payload (application/json):**
        ```json
        {
          // lead, reserva, imovel, tipoImovel, company, precoTabelaUnidadeNoMomento são herdados/buscados a partir da reservaId no backend.
          "adquirentesSnapshot": [ // Obrigatório, Snapshot dos dados dos adquirentes no momento da proposta.
            {
              "nome": "Nome Adquirente Principal", // Obrigatório
              "cpf": "12345678900", // Obrigatório
              "rg": "1234567X",
              "nacionalidade": "Brasileiro(a)",
              "estadoCivil": "Casado(a)",
              "profissao": "Médico(a)",
              "email": "adquirente.principal@example.com",
              "contato": "+5511977776666",
              "endereco": "Rua dos Adquirentes, 789",
              "nascimento": "1985-05-20"
            }
            // ... outros coadquirentes, se houver, com a mesma estrutura.
          ],
          "valorPropostaContrato": 250000.00, // Obrigatório (Valor total negociado)
          "valorEntrada": 25000.00, // Opcional (Valor do sinal/entrada, se houver)
          "condicoesPagamentoGerais": "Sinal de R$25.000,00 e o restante financiado em 60 parcelas mensais.", // Opcional (Texto livre)
          "dadosBancariosParaPagamento": { // Opcional (Dados da empresa para o cliente realizar pagamentos)
            "bancoNome": "Banco Imobiliário S/A",
            "agencia": "0001",
            "operacao": "003",
            "contaCorrente": "12345-6",
            "cnpjPagamento": "00.123.456/0001-00",
            "pix": "chavepix@empresa.com"
          },
          "planoDePagamento": [ // Opcional, mas comum (Detalhamento das parcelas)
            {
              "tipoParcela": "PARCELA MENSAL", // Obrigatório (Enum: "ATO", "PARCELA MENSAL", "INTERCALADA", "SALDO FINAL", etc.)
              "quantidade": 60, // Obrigatório
              "valorUnitario": 3750.00, // Obrigatório
              "vencimentoPrimeira": "2025-02-10", // Obrigatório (ISO Date)
              "observacao": "Parcelas do financiamento direto com a construtora." // Opcional
            }
            // ... outras entradas para diferentes tipos de parcelas (ex: balões)
          ],
          "corretagem": { // Opcional (Informações de comissão de corretagem)
            "valorCorretagem": 12500.00, // Obrigatório se a seção corretagem for informada
            "corretorPrincipal": "ObjectId_do_BrokerContact_Principal", // Opcional (Ref: BrokerContact)
            "corretoresEnvolvidos": [ // Opcional (Se houver divisão de comissão)
              { "brokerContactId": "ObjectId_Broker_1", "percentualComissao": 50 }, // Ref: BrokerContact
              { "brokerContactId": "ObjectId_Broker_2", "percentualComissao": 50 }
            ],
            "condicoesPagamentoCorretagem": "Pago 50% na assinatura do contrato e 50% na entrega das chaves.", // Opcional
            "observacoesCorretagem": "Comissão padrão de 5%." // Opcional
          },
          "statusPropostaContrato": "Em Elaboração", // Opcional, Default: "Em Elaboração"
          "responsavelNegociacao": "ObjectId_do_Usuario_do_CRM_Responsavel", // Obrigatório (Ref: User)
          "observacoesInternasProposta": "Cliente precisa de aprovação de crédito bancário. Acompanhar." // Opcional
          // corpoContratoHTMLGerado é definido internamente como um placeholder inicialmente.
          // createdBy é inferido pelo usuário autenticado.
          // modeloContratoUtilizado é null inicialmente.
        }
        ```

*   #### `GET /propostas-contratos/{propostaId}`
    *   **Descrição:** Obtém os detalhes de uma proposta/contrato específico.
    *   **Fluxo CRM:** Usado para revisar todos os termos de uma proposta, verificar seu status, gerar o documento para impressão/assinatura, ou como base para edição.

*   #### `PUT /propostas-contratos/{propostaId}`
    *   **Descrição:** Atualiza os detalhes de uma proposta/contrato. Enviar apenas os campos que devem ser modificados.
    *   **Fluxo CRM:** Usado para modificar condições financeiras após renegociação, alterar o plano de pagamento, atualizar o status da proposta (ex: de "Em Elaboração" para "Aguardando Aprovações", ou de "Aprovada" para "Aguardando Assinatura Cliente"), ou para salvar o conteúdo HTML do contrato após ter sido gerado e/ou editado.
    *   **Payload (application/json):** (Campos são opcionais)
        ```json
        {
          "valorPropostaContrato": 245000.00, // Ex: valor renegociado com desconto
          "planoDePagamento": [ /* ... plano de pagamento atualizado ... */ ],
          "statusPropostaContrato": "Aguardando Assinatura Cliente",
          "modeloContratoUtilizado": "ObjectId_do_ModeloContrato_Selecionado", // Se um modelo foi usado/vinculado
          "corpoContratoHTMLGerado": "<html>... Conteúdo HTML completo do contrato ...</html>", // Ao salvar o contrato após geração/edição
          "dataAssinaturaCliente": "2024-11-30T10:00:00Z", // Se o cliente assinou
          "dataVendaEfetivada": "2024-12-05T15:00:00Z", // Se a venda foi concluída
          "observacoesInternasProposta": "Desconto de R$5.000 concedido pelo gerente."
          // ... quaisquer outros campos permitidos para atualização
        }
        ```

*   #### `DELETE /propostas-contratos/{propostaId}`
    *   **Descrição:** Remove uma proposta/contrato, geralmente permitido apenas se estiver em um status inicial (ex: "Em Elaboração").
    *   **Fluxo CRM:** Usado para excluir propostas criadas por engano, duplicadas, ou que foram abandonadas antes de qualquer formalização significativa. A ação pode reverter o status do imóvel e da reserva associada.

*   #### `POST /propostas-contratos/{propostaId}/gerar-documento`
    *   **Descrição:** Gera o conteúdo HTML do documento da proposta/contrato com base em um `ModeloContrato` selecionado. O HTML gerado é retornado na resposta e **não é salvo automaticamente** na proposta; deve ser salvo através de um `PUT /propostas-contratos/{propostaId}` subsequente.
    *   **Fluxo CRM:** Usado após a definição dos termos da proposta para criar o documento formal (minuta) a ser apresentado ao cliente. Permite que o usuário visualize o documento antes de salvá-lo.
    *   **Payload (application/json):**
        ```json
        {
          "modeloContratoId": "ObjectId_do_ModeloContrato_a_ser_usado" // Obrigatório
        }
        ```
    *   **Resposta Esperada (application/json):**
        ```json
        {
          "htmlConteudo": "<html><head>...</head><body><h1>Proposta Comercial</h1><p>Detalhes para {{lead_nome}}...</p>...</body></html>",
          "modeloContratoUtilizado": "ObjectId_do_ModeloContrato_usado" // Para referência
        }
        ```

*   #### `GET /propostas-contratos/{propostaId}/pdf`
    *   **Descrição:** Gera e retorna para download um arquivo PDF do documento da proposta/contrato. O PDF é gerado a partir do campo `corpoContratoHTMLGerado` que está salvo na proposta.
    *   **Fluxo CRM:** Usado para obter uma versão PDF do contrato para envio ao cliente, coleta de assinaturas digitais (se não integrado), ou para arquivamento formal.

*   #### `PATCH /propostas-contratos/{propostaId}/distratar`
    *   **Descrição:** Realiza o processo de distrato de um contrato que já havia sido efetivado.
    *   **Fluxo CRM:** Usado em situações onde uma venda já concluída precisa ser desfeita (ex: por inadimplência, acordo entre as partes). Esta ação atualiza o status da proposta/contrato para "Distrato Realizado", registra o motivo e data, e deve reverter o status do imóvel para "Disponível" ou outro status apropriado.
    *   **Payload (application/json):**
        ```json
        {
          "motivoDistrato": "Desistência do comprador por motivos financeiros pessoais, conforme acordo.", // Obrigatório
          "dataDistrato": "2025-03-15T00:00:00Z" // Obrigatório (ISO Date)
        }
        ```

---

## 4. Imóveis

Gerencia os imóveis disponíveis para venda, divididos em Unidades (parte de Empreendimentos) e Imóveis Avulsos.

### 4.1 Unidades (de Empreendimentos)

*   **API Base Path:** `/empreendimentos/{empreendimentoId}/unidades` ou `/unidades` (para operações diretas na unidade usando seu ID)

#### Endpoints:

*   #### `GET /empreendimentos/{empreendimentoId}/unidades`
    *   **Descrição:** Lista todas as unidades pertencentes a um `empreendimentoId` específico.
    *   **Fluxo CRM:** Usado para visualizar a disponibilidade de unidades dentro de um empreendimento, consultar tabela de preços, filtrar por características (tipologia, área).
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `identificador` (String, Opcional): Filtrar por identificador da unidade (ex: "Apto 101").
        *   `tipologia` (String, Opcional): Filtrar por descrição da tipologia.
        *   `statusUnidade` (String, Opcional, Enum: `Disponível`, `Reservada`, `Proposta`, `Vendido`, `Bloqueado`): Filtrar por status.
        *   `areaUtilMin`, `areaUtilMax` (Number, Opcional): Filtrar por range de área útil.
        *   `precoMin`, `precoMax` (Number, Opcional): Filtrar por range de preço de tabela.

*   #### `POST /empreendimentos/{empreendimentoId}/unidades`
    *   **Descrição:** Cria uma nova unidade dentro do `empreendimentoId` especificado.
    *   **Fluxo CRM:** Usado ao cadastrar as unidades de um novo lançamento imobiliário ou adicionar novas fases/blocos a um empreendimento existente.
    *   **Payload (application/json):**
        ```json
        {
          // empreendimentoId é fornecido na URL
          "identificador": "Apto 201, Bloco A", // Obrigatório (Ex: "Lote B27", "Casa 15")
          "tipologia": "2 Quartos com Suíte e Varanda Gourmet", // Opcional
          "areaUtil": 75.50, // Opcional (em m²)
          "areaTotal": 90.00, // Opcional (em m²)
          "precoTabela": 450000.00, // Opcional
          "statusUnidade": "Disponível", // Opcional, Enum: ["Disponível", ...], Default: "Disponível"
          "observacoesInternas": "Vista para o parque. Sol da manhã.", // Opcional
          "destaque": false // Opcional (para marcar unidade como destaque em listagens)
          // companyId é herdado do empreendimento pai.
          // ativo default true.
        }
        ```

*   #### `GET /unidades/{unidadeId}`
    *   **Descrição:** Obtém os detalhes de uma unidade específica pelo seu `unidadeId`.
    *   **Fluxo CRM:** Usado para ver informações completas de uma unidade, seu status atual, preço, e histórico (se aplicável, através de outros endpoints ou campos populados).

*   #### `PUT /unidades/{unidadeId}`
    *   **Descrição:** Atualiza os detalhes de uma unidade específica.
    *   **Fluxo CRM:** Usado para corrigir informações cadastrais da unidade, atualizar seu preço de tabela, alterar tipologia, ou fazer anotações internas.
    *   **Payload (application/json):** (Campos são opcionais, enviar apenas o que mudou)
        ```json
        {
          "identificador": "Apto 201, Torre Sol",
          "precoTabela": 455000.00,
          "statusUnidade": "Bloqueado", // Ex: bloqueio para manutenção ou negociação especial
          "observacoesInternas": "Unidade decorada para visitação. Retirar itens antes da venda."
        }
        ```

*   #### `DELETE /unidades/{unidadeId}`
    *   **Descrição:** Remove/desativa uma unidade do sistema.
    *   **Fluxo CRM:** Usado raramente, talvez para unidades cadastradas por engano. Se a unidade já teve interações (reservas, propostas), o ideal é torná-la inativa ou bloqueada.

*   #### `PATCH /unidades/{unidadeId}/status`
    *   **Descrição:** Atualiza rapidamente o status de uma unidade e, opcionalmente, vincula um lead ou reserva.
    *   **Fluxo CRM:** Forma eficiente de mudar o status da unidade (ex: de "Disponível" para "Reservada" ao criar uma reserva). Frequentemente chamado internamente por outros serviços (ex: ao criar uma Reserva).
    *   **Payload (application/json):**
        ```json
        {
          "statusUnidade": "Reservada", // Obrigatório (Novo status)
          "currentLeadId": "ObjectId_do_Lead_associado_a_reserva_ou_proposta", // Opcional
          "currentReservaId": "ObjectId_da_Reserva_ativa" // Opcional
        }
        ```

### 4.2 Imóveis Avulsos

Gerencia imóveis que não pertencem a um Empreendimento (ex: casas usadas, terrenos particulares).

*   **API Base Path:** `/imoveis-avulsos`

#### Endpoints:

*   #### `GET /imoveis-avulsos`
    *   **Descrição:** Lista todos os imóveis avulsos da empresa, com filtros e paginação.
    *   **Fluxo CRM:** Usado para corretores visualizarem o portfólio de imóveis de terceiros, filtrar por tipo, localização, preço, para apresentar aos clientes.
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `titulo` (String, Opcional): Filtrar por título do anúncio.
        *   `tipoImovel` (String, Opcional, Enum: `Apartamento`, `Casa`, `Terreno`, `Sala Comercial`, etc.): Filtrar por tipo.
        *   `status` (String, Opcional, Enum: `Disponível`, `Reservado`, `Vendido`, `Inativo`, `Proposta`): Filtrar por status.
        *   `bairro`, `cidade`, `uf` (String, Opcional): Filtrar por localização.
        *   `quartosMin`, `quartosMax` (Number, Opcional): Filtrar por range de quartos.
        *   `precoMin`, `precoMax` (Number, Opcional): Filtrar por range de preço.
        *   `responsavelId` (ObjectId, Opcional): Filtrar pelo corretor responsável.

*   #### `POST /imoveis-avulsos`
    *   **Descrição:** Cadastra um novo imóvel avulso.
    *   **Fluxo CRM:** Usado para incluir no portfólio da imobiliária imóveis captados de proprietários terceiros, imóveis usados, ou oportunidades que não se encaixam como unidades de empreendimentos.
    *   **Payload (application/json):**
        ```json
        {
          "titulo": "Casa Térrea 3 Quartos com Piscina no Bairro Flores", // Obrigatório
          "descricao": "Excelente casa com amplo quintal, piscina, área gourmet, recém-reformada. Documentação OK.", // Opcional
          "tipoImovel": "Casa", // Obrigatório, Enum: ['Apartamento', 'Casa', 'Terreno', ...]
          "status": "Disponível", // Opcional, Enum: ['Disponível', ...], Default: 'Disponível'
          "quartos": 3, // Opcional
          "suites": 1, // Opcional
          "banheiros": 2, // Opcional
          "vagasGaragem": 2, // Opcional
          "areaUtil": 150.00, // Opcional (m²)
          "areaTotal": 300.00, // Obrigatório (m²)
          "preco": 650000.00, // Obrigatório
          "endereco": { // Obrigatório
            "logradouro": "Rua das Palmeiras, 450",
            "numero": "450",
            "complemento": "Casa A",
            "bairro": "Flores", // Obrigatório
            "cidade": "Manaus", // Obrigatório
            "uf": "AM", // Obrigatório (2 caracteres)
            "cep": "69000-000" // Opcional
          },
          "fotos": [ // Opcional (Array de objetos com url e descrição)
            { "url": "https://example.com/imovel/foto1.jpg", "descricao": "Fachada principal" },
            { "url": "https://example.com/imovel/foto2.jpg", "descricao": "Área da piscina" }
          ],
          "responsavel": "ObjectId_do_Usuario_Corretor_responsavel_pela_captacao" // Obrigatório (Ref: User)
          // companyId é inferido pelo usuário autenticado.
        }
        ```

*   #### `GET /imoveis-avulsos/{imovelId}`
    *   **Descrição:** Obtém os detalhes de um imóvel avulso específico.
    *   **Fluxo CRM:** Usado para visualizar todas as informações de um imóvel avulso, incluindo fotos, descrição completa, antes de apresentá-lo a um cliente ou para gerenciar sua listagem.

*   #### `PUT /imoveis-avulsos/{imovelId}`
    *   **Descrição:** Atualiza os detalhes de um imóvel avulso.
    *   **Fluxo CRM:** Usado para corrigir informações, atualizar o preço de venda, adicionar ou remover fotos, alterar a descrição, ou mudar o corretor responsável.
    *   **Payload (application/json):** (Campos são opcionais, enviar apenas o que mudou)
        ```json
        {
          "titulo": "Casa Térrea Reformada 3 Quartos no Bairro Flores - Oportunidade!",
          "preco": 630000.00, // Ex: Preço reduzido para venda rápida
          "status": "Disponível", // Pode ser alterado aqui também
          "descricao": "Proprietário motivado para vender. Aceita financiamento.",
          "fotos": [ /* ... lista completa e atualizada de fotos ... */ ]
        }
        ```

*   #### `DELETE /imoveis-avulsos/{imovelId}`
    *   **Descrição:** Remove/desativa um imóvel avulso do sistema.
    *   **Fluxo CRM:** Usado quando o imóvel é vendido por outra imobiliária, o proprietário desiste da venda, ou o contrato de listagem expira. Se já teve interações, prefira inativar.

*   #### `PATCH /imoveis-avulsos/{imovelId}/status`
    *   **Descrição:** Atualiza rapidamente o status de um imóvel avulso.
    *   **Fluxo CRM:** Similar ao PATCH de status da Unidade, para mudar status como "Reservado", "Proposta", "Vendido".
    *   **Payload (application/json):**
        ```json
        {
          "status": "Reservado", // Obrigatório
          "currentLeadId": "ObjectId_do_Lead_associado", // Opcional
          "currentReservaId": "ObjectId_da_Reserva_ativa" // Opcional
        }
        ```

---

## 5. Empreendimentos

Gerencia projetos imobiliários maiores que contêm múltiplas Unidades.

*   **API Base Path:** `/empreendimentos`

### Endpoints:

*   #### `GET /empreendimentos`
    *   **Descrição:** Lista todos os empreendimentos da empresa.
    *   **Fluxo CRM:** Usado para ter uma visão geral de todos os projetos da construtora/imobiliária, filtrar por status (lançamento, obras, concluído), localização.
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `nome` (String, Opcional): Filtrar por nome do empreendimento.
        *   `tipo` (String, Opcional, Enum: `Residencial Vertical`, `Residencial Horizontal`, `Loteamento`, `Comercial`): Filtrar por tipo.
        *   `statusEmpreendimento` (String, Opcional, Enum: `Em Planejamento`, `Breve Lançamento`, `Em Lançamento`, `Em Obras`, `Pronto para Morar`, `Concluído`, `Vendido 100%`): Filtrar por status.
        *   `cidade`, `uf` (String, Opcional): Filtrar por localização.

*   #### `POST /empreendimentos`
    *   **Descrição:** Cadastra um novo empreendimento.
    *   **Fluxo CRM:** Usado ao iniciar a divulgação e comercialização de um novo projeto imobiliário. Contém informações macro sobre o projeto. As unidades são cadastradas separadamente dentro do empreendimento.
    *   **Payload (application/json):**
        ```json
        {
          "nome": "Residencial Vista Verde Towers", // Obrigatório
          "construtoraIncorporadora": "Construtora Alfa Omega Ltda.", // Opcional
          "localizacao": { // Obrigatório
            "logradouro": "Avenida das Nações, 1000",
            "numero": "1000",
            "bairro": "Setor Nobre",
            "cidade": "Capital City", // Obrigatório
            "uf": "EX", // Obrigatório (2 caracteres)
            "cep": "70000-000", // Opcional
            "latitude": "-15.799876", // Opcional
            "longitude": "-47.863696" // Opcional
          },
          "tipo": "Residencial Vertical", // Obrigatório, Enum: [...]
          "statusEmpreendimento": "Breve Lançamento", // Obrigatório, Enum: [...]
          "descricao": "Modernas torres com apartamentos de 2 e 3 quartos, área de lazer completa e localização privilegiada.", // Opcional
          "imagemPrincipal": { // Opcional
            "url": "https://example.com/empreendimento/fachada.jpg",
            "thumbnailUrl": "https://example.com/empreendimento/fachada_thumb.jpg",
            "altText": "Fachada do Residencial Vista Verde Towers"
          },
          "dataPrevistaEntrega": "2026-12-31" // Opcional (ISO Date string, YYYY-MM-DD)
          // companyId é inferido pelo usuário autenticado.
          // ativo default true.
        }
        ```

*   #### `GET /empreendimentos/{empreendimentoId}`
    *   **Descrição:** Obtém os detalhes de um empreendimento específico.
    *   **Fluxo CRM:** Usado para visualizar todas as informações de um projeto, incluindo sua descrição, status, localização e, através de virtuals ou chamadas subsequentes, um resumo de suas unidades.

*   #### `PUT /empreendimentos/{empreendimentoId}`
    *   **Descrição:** Atualiza os detalhes de um empreendimento.
    *   **Fluxo CRM:** Usado para atualizar informações do projeto à medida que ele avança, como mudança de status (ex: de "Em Lançamento" para "Em Obras"), atualização da data de entrega, ou adição de novas imagens e descrições.
    *   **Payload (application/json):** (Campos são opcionais, enviar apenas o que mudou)
        ```json
        {
          "nome": "Residencial Vista Verde Towers - Fase II",
          "statusEmpreendimento": "Em Obras",
          "dataPrevistaEntrega": "2027-06-30",
          "descricao": "Obras aceleradas! Visite o stand de vendas e conheça o apartamento decorado."
        }
        ```

*   #### `DELETE /empreendimentos/{empreendimentoId}`
    *   **Descrição:** Remove/desativa um empreendimento.
    *   **Fluxo CRM:** Ação drástica, usada apenas se um projeto foi cadastrado por engano e não possui unidades ou interações vinculadas. Se já possui unidades, o ideal é marcar o empreendimento como inativo ou concluir seu ciclo de vendas.

---

## 6. Usuários e Autenticação

Gerencia usuários do sistema (administradores, corretores) e seus processos de autenticação.

*   **API Base Path:** `/usuarios` para gerenciamento, `/auth` para autenticação.

### Endpoints de Gerenciamento (`/usuarios`):

*   #### `GET /usuarios` (Requer perfil 'admin')
    *   **Descrição:** Lista todos os usuários da empresa.
    *   **Fluxo CRM:** Administrador visualiza e gerencia a equipe de corretores e outros usuários do sistema.
    *   **Parâmetros de Query:**
        *   `page`, `limit`, `sortBy`, `sortOrder`
        *   `nome` (String, Opcional): Filtrar por nome.
        *   `email` (String, Opcional): Filtrar por email.
        *   `perfil` (String, Opcional, Enum: `admin`, `corretor`): Filtrar por perfil.
        *   `ativo` (Boolean, Opcional): Filtrar por status de ativo/inativo.

*   #### `POST /usuarios` (Requer perfil 'admin')
    *   **Descrição:** Cria um novo usuário para a empresa.
    *   **Fluxo CRM:** Administrador cadastra novos membros para a equipe de vendas ou administrativa, definindo seu perfil de acesso e senha inicial.
    *   **Payload (application/json):**
        ```json
        {
          "nome": "Novo Corretor Silva", // Obrigatório
          "email": "novo.corretor.silva@example.com", // Obrigatório (deve ser único globalmente ou por empresa)
          "senha": "SenhaForteTemporaria123!", // Obrigatório
          "perfil": "corretor", // Obrigatório, Enum: ['admin', 'corretor']
          "ativo": true // Opcional, default true
          // companyId é o mesmo do administrador que está criando.
        }
        ```

*   #### `GET /usuarios/me`
    *   **Descrição:** Obtém os dados do usuário atualmente autenticado.
    *   **Fluxo CRM:** Usado pelo frontend para exibir informações do perfil do usuário logado, como nome e permissões.

*   #### `PUT /usuarios/me`
    *   **Descrição:** Permite que o usuário autenticado atualize seus próprios dados (ex: nome, senha).
    *   **Fluxo CRM:** Usuário acessa seu perfil para alterar informações pessoais ou trocar sua senha de acesso.
    *   **Payload (application/json):**
        ```json
        {
          "nome": "Meu Nome Atualizado", // Opcional
          "senhaAtual": "SenhaAntiga123", // Obrigatório apenas se for mudar a senha
          "novaSenha": "NovaSenhaSuperForte456!" // Obrigatório apenas se for mudar a senha (com confirmação idealmente)
        }
        ```

*   #### `GET /usuarios/{usuarioId}` (Requer perfil 'admin')
    *   **Descrição:** Obtém os detalhes de um usuário específico.
    *   **Fluxo CRM:** Administrador consulta dados de um usuário da equipe.

*   #### `PUT /usuarios/{usuarioId}` (Requer perfil 'admin')
    *   **Descrição:** Atualiza os detalhes de um usuário específico (feito por um administrador).
    *   **Fluxo CRM:** Administrador altera dados de um usuário, como seu perfil (ex: promover corretor para admin), status (ativar/desativar conta), ou resetar senha (gerenciamento à parte).
    *   **Payload (application/json):** (Campos são opcionais)
        ```json
        {
          "nome": "Nome Corretor Editado Adm",
          "email": "corretor.editado.adm@example.com", // Cuidado com unicidade
          "perfil": "admin", // Ex: promoção
          "ativo": false // Ex: desativação de conta
        }
        ```

*   #### `DELETE /usuarios/{usuarioId}` (Requer perfil 'admin')
    *   **Descrição:** Desativa um usuário (soft delete).
    *   **Fluxo CRM:** Administrador remove o acesso de um usuário que não faz mais parte da equipe. Leads e outras entidades associadas a ele podem precisar ser reatribuídas.

### Endpoints de Autenticação (`/auth`):

*   #### `POST /auth/login`
    *   **Descrição:** Autentica um usuário com email e senha, retornando um token JWT e informações do usuário.
    *   **Fluxo CRM:** Principal forma de acesso ao sistema para usuários cadastrados.
    *   **Payload (application/json):**
        ```json
        {
          "email": "usuario@example.com",
          "senha": "minhasenha123"
        }
        ```
    *   **Resposta Esperada (application/json):**
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "refreshToken": "anotherLongTokenForRefresh...", // Opcional, se usar refresh tokens
          "user": {
            "id": "ObjectId_do_Usuario",
            "nome": "Nome do Usuário",
            "email": "usuario@example.com",
            "perfil": "corretor",
            "companyId": "ObjectId_da_Empresa"
          }
        }
        ```

*   #### `POST /auth/google`
    *   **Descrição:** Autentica um usuário utilizando um token de autenticação do Google (obtido no frontend via Google Sign-In).
    *   **Fluxo CRM:** Oferece login social para facilitar o acesso de usuários que possuem conta Google. O backend valida o token com o Google, busca/cria o usuário no CRM e retorna um token JWT da aplicação.
    *   **Payload (application/json):**
        ```json
        {
          "token": "google_id_token_ou_access_token_recebido_do_frontend_sdk_do_google"
        }
        ```
    *   **Resposta Esperada:** Similar à do `/auth/login`.

*   #### `POST /auth/facebook`
    *   **Descrição:** Autentica um usuário utilizando um token de autenticação do Facebook (similar ao Google).
    *   **Fluxo CRM:** Login social via Facebook.
    *   **Payload (application/json):**
        ```json
        {
          "token": "facebook_access_token_recebido_do_frontend_sdk_do_facebook"
        }
        ```
    *   **Resposta Esperada:** Similar à do `/auth/login`.

*   #### `POST /auth/refresh-token`
    *   **Descrição:** Obtém um novo token de acesso (JWT) utilizando um `refreshToken` válido.
    *   **Fluxo CRM:** Usado para renovar a sessão do usuário sem exigir que ele faça login novamente, quando o token de acesso principal expira.
    *   **Payload (application/json):**
        ```json
        {
          "refreshToken": "valor_do_refresh_token_armazenado_de_forma_segura_no_cliente"
        }
        ```
    *   **Resposta Esperada (application/json):**
        ```json
        {
          "token": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```

*   #### `POST /auth/logout`
    *   **Descrição:** Invalida o token do usuário no lado do servidor (se estiver usando blacklist de tokens ou gerenciamento de sessão).
    *   **Fluxo CRM:** Usuário encerra sua sessão no sistema.
    *   **Payload:** Pode ser vazio ou conter o token para invalidação explícita.

---

## 7. Empresa

Gerencia informações da empresa (construtora/imobiliária) que utiliza o sistema. Geralmente, é um recurso singleton para a empresa do usuário autenticado.

*   **API Base Path:** `/empresa`

### Endpoints:

*   #### `GET /empresa`
    *   **Descrição:** Obtém os dados da empresa à qual o usuário autenticado pertence.
    *   **Fluxo CRM:** Usado para exibir informações da empresa no sistema, preencher dados em documentos (ex: contratos), ou para configurações específicas da empresa.

*   #### `PUT /empresa` (Requer perfil 'admin')
    *   **Descrição:** Atualiza os dados da empresa.
    *   **Fluxo CRM:** Administrador configura ou atualiza informações cadastrais da imobiliária/construtora, como nome, CNPJ, endereço, e configurações de integração.
    *   **Payload (application/json):** (Campos são opcionais)
        ```json
        {
          "nome": "Minha Imobiliária TOP Ltda.",
          "cnpj": "00.111.222/0001-33", // Com validação de formato e unicidade
          "endereco": "Rua da Matriz, 10, Centro, Cidade - UF", // Exemplo
          "telefoneComercial": "+551133334444",
          "emailComercial": "contato@topimobiliaria.com",
          "website": "https://www.topimobiliaria.com",
          "facebookPageId": "123456789012345", // ID da Página do Facebook
          "linkedFacebookForms": [ // Formulários do Facebook Lead Ads vinculados
            { "formId": "formId1", "formName": "Campanha Imóveis de Luxo" }
          ]
          // ... outros campos do schema Company.js
        }
        ```

*   #### `POST /empresa/conectar-facebook` (Requer perfil 'admin')
    *   **Descrição:** Conecta ou atualiza a conexão da página do Facebook da empresa para integração com Lead Ads.
    *   **Fluxo CRM:** Permite que o CRM receba leads automaticamente de formulários do Facebook Lead Ads. Envolve OAuth com o Facebook.
    *   **Payload (application/json):** (A estrutura exata depende da implementação do fluxo OAuth do Facebook)
        ```json
        {
          "pageAccessToken": "facebook_page_long_lived_access_token", // Token de acesso à página
          "pageId": "id_da_pagina_do_facebook_selecionada",
          "connectedByUserId": "ObjectId_do_Usuario_que_realizou_a_conexao" // Pode ser inferido
        }
        ```

*   #### `DELETE /empresa/desconectar-facebook` (Requer perfil 'admin')
    *   **Descrição:** Desconecta a página do Facebook da empresa, interrompendo a sincronização de leads.
    *   **Fluxo CRM:** Usado se a empresa não deseja mais a integração com o Facebook Lead Ads ou precisa reconfigurá-la.

---

## 8. Configurações (Entidades Auxiliares)

Gerencia diversas entidades de configuração usadas em outros módulos, como estágios de lead, origens, etc. Todas são escopadas pela empresa.

*   **API Base Path:** `/configuracoes/*`

### 8.1 Lead Stages (Situações de Lead)

*   **API Path:** `/configuracoes/lead-stages`
*   **Fluxo CRM:** Administrador define as etapas do funil de vendas (ex: Novo, Em Contato, Qualificado, Proposta, Venda Perdida) que serão usadas para classificar os leads.
*   **Endpoints:**
    *   `GET /configuracoes/lead-stages` (Lista todos os estágios da empresa)
    *   `POST /configuracoes/lead-stages` (Cria um novo estágio)
        *   **Payload:** `{ "nome": "Networking", "ordem": 1, "ativo": true }`
    *   `GET /configuracoes/lead-stages/{stageId}` (Detalhes de um estágio)
    *   `PUT /configuracoes/lead-stages/{stageId}` (Atualiza um estágio)
        *   **Payload:** `{ "nome": "Contato Inicial", "ordem": 2 }`
    *   `DELETE /configuracoes/lead-stages/{stageId}` (Remove/desativa um estágio)

### 8.2 Origens de Lead

*   **API Path:** `/configuracoes/origens-lead`
*   **Fluxo CRM:** Administrador cadastra os canais por onde os leads chegam (ex: Website, Indicação, Facebook Ads, Portal Imobiliário).
*   **Endpoints:**
    *   `GET /configuracoes/origens-lead`
    *   `POST /configuracoes/origens-lead`
        *   **Payload:** `{ "nome": "Portal ZAP Imóveis", "descricao": "Leads do portal ZAP", "ativo": true }`
    *   `GET /configuracoes/origens-lead/{origemId}`
    *   `PUT /configuracoes/origens-lead/{origemId}`
        *   **Payload:** `{ "nome": "Portal Viva Real" }`
    *   `DELETE /configuracoes/origens-lead/{origemId}`

### 8.3 Discard Reasons (Motivos de Descarte de Lead)

*   **API Path:** `/configuracoes/discard-reasons`
*   **Fluxo CRM:** Administrador define os motivos pelos quais um lead pode ser marcado como "descartado" (ex: Sem Interesse, Contato Inválido, Fora de Orçamento).
*   **Endpoints:**
    *   `GET /configuracoes/discard-reasons`
    *   `POST /configuracoes/discard-reasons`
        *   **Payload:** `{ "nome": "Já comprou com concorrente", "ativo": true }`
    *   `GET /configuracoes/discard-reasons/{reasonId}`
    *   `PUT /configuracoes/discard-reasons/{reasonId}`
    *   `DELETE /configuracoes/discard-reasons/{reasonId}`

### 8.4 Modelos de Contrato

*   **API Path:** `/configuracoes/modelos-contrato`
*   **Fluxo CRM:** Administrador ou usuário com permissão cria e gerencia templates de documentos (Propostas, Contratos de Compra e Venda, Contratos de Reserva) que podem ser usados para gerar documentos preenchidos com dados do CRM.
*   **Endpoints:**
    *   `GET /configuracoes/modelos-contrato`
    *   `POST /configuracoes/modelos-contrato`
        *   **Payload:**
            ```json
            {
              "nomeModelo": "Proposta Comercial Padrão - Residencial", // Obrigatório
              "tipoDocumento": "Proposta", // Obrigatório, Enum: ["Proposta", "Contrato de Reserva", ...]
              "conteudoHTMLTemplate": "<html><body><h1>Proposta para {{lead_nome}}</h1>...</body></html>", // Obrigatório
              "placeholdersDisponiveis": [ // Opcional, informativo
                { "placeholder": "{{lead_nome}}", "descricao": "Nome completo do lead principal" },
                { "placeholder": "{{imovel_identificador}}", "descricao": "Identificador do imóvel" }
              ],
              "ativo": true
            }
            ```
    *   `GET /configuracoes/modelos-contrato/{modeloId}`
    *   `PUT /configuracoes/modelos-contrato/{modeloId}`
        *   **Payload:** (similar ao POST, apenas campos a atualizar)
    *   `DELETE /configuracoes/modelos-contrato/{modeloId}`

### 8.5 Broker Contacts (Contatos de Corretores/Imobiliárias Parceiras)

*   **API Path:** `/configuracoes/broker-contacts`
*   **Fluxo CRM:** Cadastro de corretores autônomos ou imobiliárias parceiras que podem estar envolvidos em negociações e divisão de comissões.
*   **Endpoints:**
    *   `GET /configuracoes/broker-contacts`
    *   `POST /configuracoes/broker-contacts`
        *   **Payload:**
            ```json
            {
              "nome": "João Corretor Parceiro", // Obrigatório
              "contato": "+5511955554444",
              "email": "joao.parceiro@email.com", // Único por empresa (sparse)
              "creci": "12345-F", // Único por empresa (sparse)
              "nomeImobiliaria": "Imobiliária Amiga Ltda.", // Se for vinculado a uma
              "cpfCnpj": "123.456.789-00", // CPF ou CNPJ
              "ativo": true
            }
            ```
    *   `GET /configuracoes/broker-contacts/{brokerId}`
    *   `PUT /configuracoes/broker-contacts/{brokerId}`
    *   `DELETE /configuracoes/broker-contacts/{brokerId}`

---

## 9. Histórico de Leads

Registra atividades e alterações importantes relacionadas a um lead.

*   **API Base Path:** `/leads/{leadId}/historico`

### Endpoints:

*   #### `GET /leads/{leadId}/historico`
    *   **Descrição:** Lista o histórico de atividades de um lead específico.
    *   **Fluxo CRM:** Usado para entender toda a jornada do lead dentro do CRM: quando foi criado, quem o atendeu, mudanças de status, propostas enviadas, e-mails registrados (se houver integração), etc. Fundamental para auditoria e análise de interações.
    *   **Parâmetros de Query:**
        *   `page`, `limit`
        *   `action` (String, Opcional): Filtrar por tipo de ação (ex: `CRIACAO`, `ATUALIZACAO_STATUS`, `PROPOSTA_CRIADA`).
    *   **Resposta Esperada (Exemplo de um item do array):**
        ```json
        {
          "id": "ObjectId_do_Historico",
          "lead": "ObjectId_do_Lead",
          "user": "ObjectId_do_Usuario_que_realizou_a_acao", // ou null para ações do sistema
          "userName": "Nome do Usuário", // Populado para facilitar exibição
          "action": "ATUALIZACAO_STATUS", // Enum de ações
          "details": "Status alterado de 'Novo' para 'Em Contato'",
          "createdAt": "2024-01-15T10:30:00Z"
        }
        ```

---

## Opcional: Exemplos de Chamadas `curl`

### Criar um novo Lead:
```bash
curl -X POST \
  http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT' \
  -d '{
        "nome": "Maria Silva Curl",
        "contato": "+5521999998877",
        "email": "maria.curl@example.com",
        "situacao": "60c72b3f9b1e8a3f1c8e4a3c", // Substituir pelo ObjectId de um LeadStage válido
        "origem": "60c72b3f9b1e8a3f1c8e4a3d", // Substituir pelo ObjectId de uma Origem válida
        "responsavel": "60c72b3f9b1e8a3f1c8e4a3e" // Substituir pelo ObjectId de um User válido
      }'
```

### Listar Propostas com status "Aprovada":
```bash
curl -X GET \
  'http://localhost:3000/api/propostas-contratos?statusPropostaContrato=Aprovada&limit=10' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT'
```

### Atualizar o preço de uma Unidade:
```bash
curl -X PUT \
  http://localhost:3000/api/unidades/60c72b3f9b1e8a3f1c8e4b1a \ # Substituir pelo ObjectId da Unidade
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT' \
  -d '{
        "precoTabela": 520000.00
      }'
```

Este modelo de API visa cobrir as funcionalidades centrais do CRM Imobiliário, permitindo a evolução e adição de novos recursos de forma organizada.
