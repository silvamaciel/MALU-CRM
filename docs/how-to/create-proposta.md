# Como Criar uma Proposta/Contrato

Este guia detalha o processo de criação de uma nova Proposta/Contrato no sistema, desde a interface do usuário até o processamento no backend e salvamento final.

## Visão Geral do Fluxo

A criação de uma Proposta/Contrato geralmente se origina a partir de uma **Reserva** existente que está no status "Ativa". O processo envolve um wizard no frontend para coletar todas as informações necessárias, uma chamada à API do backend para processar e salvar os dados, e a subsequente geração do documento (contrato em HTML/PDF) que é um passo separado.

## 1. Fluxo no Frontend (Wizard de Proposta)

A interface para criar uma nova proposta é acessada através da URL `/reservas/:reservaId/proposta-contrato/novo`, onde `:reservaId` é o ID da reserva base.

### 1.1. Carregamento Inicial

*   Ao acessar a página, o sistema busca:
    *   Dados da `Reserva` especificada (incluindo dados do `Lead` e do `Imóvel` associados).
    *   Lista de `Usuários` do CRM (para o campo "Responsável pela Negociação").
    *   Lista de `Contatos de Corretores` (para a seção de corretagem).
*   Informações da reserva (como dados do adquirente principal e preço do imóvel) são usadas para pré-preencher campos do formulário da proposta.

### 1.2. Wizard de Múltiplas Etapas

O formulário é dividido em quatro etapas (`PropostaContratoFormPage.js`):

*   **Etapa 1: Adquirentes (`StepAdquirentes`)**
    *   **Campos:** Nome completo, CPF, RG, Nacionalidade, Estado Civil, Profissão, E-mail, Contato, Endereço, Data de Nascimento.
    *   O primeiro adquirente listado é considerado o **principal**. É possível adicionar múltiplos coadquirentes.
    *   **Validação:** O nome do adquirente principal é obrigatório.

*   **Etapa 2: Financeiro (`StepFinanceiro`)**
    *   **Campos:**
        *   `valorPropostaContrato`: Valor total da negociação.
        *   `valorEntrada`: Valor a ser pago como entrada (sinal).
        *   `condicoesPagamentoGerais`: Campo de texto livre para descrever condições gerais.
        *   `planoDePagamento`: Uma lista de parcelas, onde cada parcela tem:
            *   `tipoParcela` (ATO, Mensal, Intercalada, etc.)
            *   `quantidade` de parcelas desse tipo.
            *   `valorUnitario` de cada parcela.
            *   `vencimentoPrimeira`: Data de vencimento da primeira parcela desse grupo.
            *   `observacao`.
        *   `responsavelNegociacao`: Usuário do CRM responsável pela proposta.
    *   **Validação:** Valor da proposta e responsável pela negociação são obrigatórios. Todas as parcelas no plano de pagamento devem ter valor unitário e data de vencimento.

*   **Etapa 3: Corretagem (`StepCorretagem`)**
    *   **Campos:**
        *   `valorCorretagem`: Valor total da comissão de corretagem.
        *   `corretorPrincipal`: Contato do corretor principal envolvido.
        *   `condicoesPagamentoCorretagem`: Texto livre para condições de pagamento da comissão.
        *   `observacoesCorretagem`: Observações adicionais sobre a corretagem.

*   **Etapa 4: Resumo (`StepResumo`)**
    *   Exibe um resumo de todos os dados inseridos nas etapas anteriores.
    *   Permite definir:
        *   `statusPropostaContrato`: Status inicial da proposta (default: "Em Elaboração").
        *   `observacoesInternasProposta`: Comentários internos sobre a negociação.
        *   `dataProposta`: Data da proposta (default: data atual).
    *   **Importante:** A seleção do `modeloContratoUtilizado` e a geração do `corpoContratoHTMLGerado` (o conteúdo do contrato em si) não ocorrem diretamente nesta etapa de criação. O HTML é gerado posteriormente na página de detalhes da proposta.

### 1.3. Submissão

*   Ao final da Etapa 4, o usuário clica em "Concluir e Criar Proposta".
*   Uma **janela de confirmação** é exibida, mostrando o valor total calculado da proposta (entrada + somatório das parcelas) e o valor de tabela do imóvel (para referência).
*   Ao confirmar:
    *   O frontend monta o objeto `dataToSubmit`. Este objeto inclui:
        *   Todos os dados do formulário.
        *   `adquirentesSnapshot`: Uma cópia dos dados dos adquirentes no momento da criação.
        *   `precoTabelaUnidadeNoMomento`: O preço de tabela do imóvel registrado.
        *   O campo `corpoContratoHTMLGerado` é **removido** do payload, pois o documento ainda não foi gerado.
    *   Uma chamada é feita à API para criar a proposta.

## 2. Chamada ao Backend

*   O frontend utiliza a função `createPropostaContratoApi` (definida em `frontend/src/api/propostaContratoApi.js`).
*   Esta função envia uma requisição **POST** para o endpoint:
    *   `POST /api/propostas-contratos/a-partir-da-reserva/:reservaId`
*   O corpo da requisição (`payload`) contém o objeto `dataToSubmit`.

## 3. Lógica de Processamento no Backend

### 3.1. Controller (`PropostaContratoController.js`)

*   A rota `POST /api/propostas-contratos/a-partir-da-reserva/:reservaId` é manipulada pelo `createPropostaContratoController`.
*   O controller extrai `reservaId` dos parâmetros da URL e os dados da proposta do corpo da requisição.
*   Obtém o `companyId` e `creatingUserId` do usuário autenticado (via `req.user` injetado pelo middleware de autenticação).
*   Realiza validações básicas (existência de `reservaId`, `valorPropostaContrato`, `responsavelNegociacao`).
*   Chama o método `PropostaContratoService.createPropostaContrato` para executar a lógica de negócios principal.

### 3.2. Service (`PropostaContratoService.js`)

O método `createPropostaContrato` no serviço é responsável por:

1.  **Iniciar uma Transação:** Todas as operações de banco de dados são encapsuladas em uma transação Mongoose para garantir atomicidade.
2.  **Buscar e Validar Reserva:**
    *   Busca a `Reserva` pelo `reservaId`, populando dados do `Lead` e do `Imóvel` associados.
    *   Verifica se a reserva existe e se seu status é "Ativa".
3.  **Atualizar Dados do Lead (Opcional):** Se dados dos adquirentes foram fornecidos na proposta, o serviço atualiza os campos correspondentes no documento do `Lead` principal (nome, CPF, etc., do primeiro adquirente na proposta).
4.  **Calcular Valor Total:** Recalcula o `valorPropostaContrato` somando `valorEntrada` e o total de todas as parcelas definidas em `planoDePagamento`.
5.  **Preparar Dados para Nova Proposta:**
    *   Monta um objeto com todos os dados para o novo documento `PropostaContrato`.
    *   Inclui referências (`_id`) para `lead`, `reserva`, `imovel`, `company`, `createdBy`.
    *   Cria `adquirentesSnapshot` (uma cópia dos dados dos compradores).
    *   Armazena `empreendimentoNomeSnapshot`, `unidadeIdentificadorSnapshot`, e `precoTabelaUnidadeNoMomento` para referência histórica.
    *   Define um valor placeholder inicial para `corpoContratoHTMLGerado` (ex: "Documento ainda não foi gerado...").
    *   `modeloContratoUtilizado` é definido como `null` ou o valor que veio do formulário (geralmente `null` na criação inicial).
    *   **Nota de Segurança (Backend - Dados):** Todos os dados dinâmicos (como nome do lead, detalhes do imóvel) são HTML-escapados pelo backend (`PropostaContratoService.montarDadosParaTemplate`) antes de serem usados para preencher os placeholders do modelo de contrato. Isso previne a injeção de HTML/scripts maliciosos através dos dados da proposta.
6.  **Salvar PropostaContrato:** Cria uma nova instância do modelo `PropostaContrato` e a salva no banco.
7.  **Atualizar Status da Reserva:**
    *   Altera o `reserva.statusReserva` para "ConvertidaEmProposta".
    *   Armazena o `_id` da nova proposta em `reserva.propostaId`.
8.  **Atualizar Status do Imóvel:**
    *   Altera o `status` do `Imóvel` (Unidade ou ImovelAvulso) para "Proposta".
9.  **Atualizar Situação do Lead:**
    *   Busca ou cria um `LeadStage` com nome "Proposta Emitida" (ou similar).
    *   Atualiza o campo `reserva.lead.situacao` para o `_id` deste estágio.
10. **Salvar Alterações:** Salva as modificações nos documentos da `Reserva` e do `Lead`.
11. **Registrar Histórico:** Adiciona uma entrada no histórico do `Lead` indicando que uma proposta foi criada.
12. **Commit da Transação:** Se todas as operações forem bem-sucedidas, a transação é commitada. Em caso de erro, é feito rollback.
13. **Retorno:** O serviço retorna o documento da `PropostaContrato` recém-criada.

### 3.3. Model (`PropostaContrato.js`)

*   Define a estrutura (schema) para os documentos de `PropostaContrato`.
*   Campos importantes: `lead`, `reserva`, `imovel`, `company`, `adquirentesSnapshot`, `modeloContratoUtilizado`, `valorPropostaContrato`, `planoDePagamento`, `corretagem`, `statusPropostaContrato`, `corpoContratoHTMLGerado`.
*   O campo `corpoContratoHTMLGerado` é `required: true`. Na criação, ele recebe um placeholder do serviço.
*   Possui um hook `pre('save')` que:
    *   Calcula `valorDescontoConcedido` (diferença entre `precoTabelaUnidadeNoMomento` e `valorPropostaContrato`).
    *   **Valida se o somatório das parcelas + entrada bate com o valor total da proposta** (com uma pequena margem de tolerância). Esta validação pode ser explicitamente pulada pelo serviço setando `this.$ignoreValidacaoParcelas = true` antes de salvar (o serviço `createPropostaContrato` faz isso, pois ele mesmo calcula o valor total da proposta e o atribui, garantindo a consistência).

## 4. Geração do Documento (Contrato HTML/PDF) - Passo Posterior

A criação da proposta, conforme descrito acima, foca em salvar os **dados estruturados** da negociação. A geração do documento visual (o contrato em si) é um processo separado que ocorre tipicamente após a criação da proposta:

1.  **Seleção do Modelo:** Na página de detalhes da proposta recém-criada (ou ao editá-la), o usuário pode selecionar um `ModeloContrato` previamente cadastrado no sistema.
2.  **Geração do HTML:**
    *   Uma ação no frontend (ex: botão "Gerar Documento") chama a API (`POST /api/propostas-contratos/:id/gerar-documento` com `modeloId` no corpo).
    *   O backend (`PropostaContratoService.gerarDocumentoHTML`) busca o conteúdo do template do modelo, busca os dados da proposta e entidades relacionadas (lead, imóvel, empresa vendedora, corretor).
    *   Preenche os placeholders (ex: `{{lead_principal_nome}}`) no template com os dados reais (que já foram HTML-escapados).
    *   Retorna a string HTML resultante para o frontend.
3.  **Visualização e Edição:** O frontend exibe o HTML gerado (ex: usando um editor como `react-quill`). O usuário pode fazer ajustes finos no HTML.
    *   **Nota de Segurança (Frontend - Display):** Ao exibir este HTML final (por exemplo, na página de detalhes da proposta), o frontend utiliza `DOMPurify.sanitize()` para sanitizar o conteúdo antes de renderizá-lo com `dangerouslySetInnerHTML`. Esta é uma camada de defesa em profundidade.
4.  **Salvamento do HTML:** Para persistir o HTML gerado (ou editado), o frontend chama a API de atualização da proposta (`PUT /api/propostas-contratos/:id`), enviando o conteúdo HTML no campo `corpoContratoHTMLGerado`.
    *   **Nota de Segurança (Backend - Templates):** Os `ModeloContrato` (templates base), que são criados por administradores, têm seu conteúdo HTML (`conteudoHTMLTemplate`) sanitizado pelo backend (usando `DOMPurify`) no momento em que são salvos. Isso garante que os templates base sejam seguros.
5.  **Geração de PDF:** Uma vez que o `corpoContratoHTMLGerado` está salvo (sendo este resultado de um template sanitizado + dados escapados), um PDF pode ser gerado via API (`GET /api/propostas-contratos/:id/pdf`). O backend usa Puppeteer para converter o HTML em PDF.

## 5. Salvamento Final

*   Após a execução bem-sucedida do `PropostaContratoService.createPropostaContrato`, o controller retorna o novo objeto `PropostaContrato` para o frontend com um status HTTP 201 (Created).
*   O frontend recebe a resposta, exibe uma mensagem de sucesso (toast), e navega para a página de detalhes da proposta recém-criada (ex: `/propostas-contratos/:novaPropostaId`).
*   Neste ponto, a proposta existe no banco de dados com todos os seus dados estruturais, e as entidades relacionadas (Reserva, Imóvel, Lead) foram atualizadas. O `corpoContratoHTMLGerado` contém o placeholder inicial.

Este fluxo garante que os dados da negociação sejam capturados de forma estruturada, e que as entidades relacionadas reflitam o novo estado da negociação, preparando o terreno para a posterior geração e gerenciamento do documento contratual.
