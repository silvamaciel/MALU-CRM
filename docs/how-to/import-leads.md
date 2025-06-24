# Como Importar Leads via CSV

Este guia detalha o processo de importação de múltiplos leads para o sistema utilizando um arquivo CSV. A funcionalidade permite um upload em massa, com validações e feedback sobre o resultado da importação.

## 1. Acesso à Funcionalidade

A importação de leads é realizada através de um modal (`ImportCSVModal`) que geralmente é acessível a partir da página de listagem de leads ou de uma seção administrativa. Apenas usuários com perfil de **administrador** têm permissão para realizar a importação.

## 2. Preparação do Arquivo CSV

### 2.1. Download do Modelo (Template)

*   O sistema oferece um **modelo CSV** para download. Este modelo contém os cabeçalhos esperados pelo sistema e uma linha de exemplo.
*   **Para baixar o modelo:**
    1.  Clique no botão "Baixar Planilha Modelo" dentro do modal de importação.
    2.  O frontend faz uma requisição `GET /api/leads/csv-template` ao backend.
    3.  O backend gera um arquivo CSV (`modelo_importacao_leads.csv`) com os seguintes cabeçalhos:
        *   `nome` (Obrigatório)
        *   `email` (Opcional, mas recomendado)
        *   `telefone` (Obrigatório)
        *   `cpf` (Opcional)
        *   `origem` (Opcional - Nome da origem. Se não fornecido ou inválido, o sistema pode usar uma origem padrão ou registrar um erro)
        *   `situacao` (Opcional - Nome da situação/estágio. Se não fornecido ou inválido, o sistema pode usar uma situação padrão ou registrar um erro)
        *   `comentario` (Opcional)
    4.  O navegador iniciará o download do arquivo.

### 2.2. Preenchimento do CSV

*   Abra o arquivo modelo em um editor de planilhas (Excel, Google Sheets, LibreOffice Calc).
*   Preencha as linhas com os dados dos leads que deseja importar, respeitando os cabeçalhos.
*   **Delimitador:** O sistema espera que o arquivo CSV use vírgula (`,`) ou ponto e vírgula (`;`) como delimitador. O backend detecta automaticamente qual foi usado com base no cabeçalho.
*   **Codificação:** Utilize codificação UTF-8 para evitar problemas com caracteres especiais.
*   **Formato dos Dados:**
    *   `nome`: Texto.
    *   `email`: Formato de e-mail válido (ex: `contato@exemplo.com`).
    *   `telefone`: Número de telefone. O sistema tentará formatá-lo para o padrão E.164 (ex: `+5583999998888`).
    *   `cpf`: Números do CPF. O sistema validará o formato.
    *   `origem`: Nome exato de uma origem já cadastrada no sistema para a empresa.
    *   `situacao`: Nome exato de uma situação (estágio de lead) já cadastrada no sistema para a empresa.
    *   `comentario`: Texto livre.

## 3. Upload do Arquivo CSV e Validações no Frontend

1.  **Seleção do Arquivo:**
    *   No modal de importação, arraste e solte o arquivo CSV preenchido na área designada ou clique para abrir o seletor de arquivos do seu sistema operacional.
    *   O sistema aceita apenas arquivos com extensão `.csv`.
2.  **Pré-visualização:**
    *   Após selecionar um arquivo CSV válido, o frontend utiliza a biblioteca `Papa.parse` para ler as primeiras 5 linhas do arquivo.
    *   Uma tabela de pré-visualização é exibida, mostrando os cabeçalhos detectados e os dados das primeiras linhas. Isso ajuda a verificar se o arquivo foi lido corretamente.
    *   Se o arquivo não for um CSV válido, uma mensagem de erro é exibida.
3.  **Confirmação:**
    *   Se a pré-visualização estiver correta, clique no botão "Confirmar Importação".

## 4. Processamento no Backend

### 4.1. Chamada à API

*   O frontend envia o arquivo CSV para o backend através de uma requisição **POST** para o endpoint:
    *   `POST /api/leads/importar-csv`
*   A requisição é do tipo `multipart/form-data` e o arquivo é enviado sob a chave `csvfile`.
*   Apenas usuários autenticados e com perfil de `admin` podem acessar este endpoint.

### 4.2. Controller (`LeadController.js`)

*   O `importLeadsFromCSVController` recebe a requisição.
*   Obtém o `companyId` (ID da empresa do administrador) e `createdByUserId` (ID do administrador) a partir do usuário autenticado.
*   Verifica se um arquivo foi realmente enviado (`req.file`).
*   Passa o buffer do arquivo (`req.file.buffer`), `companyId` e `createdByUserId` para o serviço `LeadService.importLeadsFromCSV`.

### 4.3. Service (`LeadService.js`)

O método `importLeadsFromCSV` realiza a lógica principal da importação:

1.  **Cache de Dados:**
    *   Para otimizar o processo, o serviço primeiro carrega em memória:
        *   Todas as `LeadStage` (situações) ativas da empresa, mapeando nome para ID.
        *   Todas as `Origem` ativas da empresa, mapeando nome para ID.
        *   Os campos `email`, `contato` e `cpf` de todos os leads existentes na empresa. Estes são armazenados em `Set`s para verificação rápida de duplicidade.
2.  **Parsing do CSV:**
    *   Converte o buffer do arquivo para string (UTF-8).
    *   Lê a linha de cabeçalho para identificar os campos e o delimitador (`,` ou `;`).
    *   Processa cada linha de dados subsequente.
3.  **Processamento de Cada Linha (Lead):**
    *   Para cada linha do CSV:
        *   **Validação de Campos Obrigatórios:** Verifica se `nome` e `telefone` estão presentes. Se não, registra um erro para essa linha.
        *   **Formatação de Dados:**
            *   `nome`: Remove espaços extras.
            *   `email`: Converte para minúsculas e remove espaços.
            *   `telefone`: Tenta normalizar para o formato E.164 (ex: `+5511999999999`) usando `google-libphonenumber`. Se inválido, registra erro.
            *   `cpf`: Remove caracteres não numéricos e valida o formato. Se inválido, registra erro.
        *   **Verificação de Duplicidade:**
            *   Compara o `email` (se houver), `telefone` formatado e `cpf` formatado (se houver) com os dados dos leads já existentes na empresa (utilizando os `Set`s carregados no passo 1).
            *   Se for encontrada uma duplicidade (mesmo email, telefone ou CPF já existe), um erro é registrado para essa linha.
        *   **Criação do Lead:**
            *   Se todas as validações passarem, o serviço monta um objeto `leadDataParaCriar`.
            *   Chama a função interna `createLead(leadDataParaCriar, companyId, createdByUserId)`. Esta função é a mesma utilizada para criar leads individualmente e contém lógica robusta para:
                *   Validação detalhada de todos os campos.
                *   Busca/criação de `Origem` e `LeadStage` com base nos nomes fornecidos no CSV (ou usa padrões se não encontrados/fornecidos).
                *   Atribuição do `responsavel` (pode ser o usuário que importou ou um padrão).
                *   Verificação final de duplicidade no banco de dados (caso haja concorrência).
                *   Salvamento do novo lead.
                *   Registro no histórico do lead.
            *   Se o lead é criado com sucesso, o contador `importedCount` é incrementado.
            *   Os dados do novo lead (email, contato, cpf) são adicionados aos `Set`s de cache para evitar que duplicatas *dentro do mesmo arquivo CSV* sejam importadas.
        *   **Registro de Erros:** Se qualquer etapa da validação ou criação falhar para uma linha, os detalhes do erro (linha, mensagem, dados da linha) são armazenados.
4.  **Retorno do Sumário:** Após processar todas as linhas, o serviço retorna um objeto de sumário contendo:
    *   `totalRows`: Número total de linhas de dados processadas.
    *   `importedCount`: Número de leads importados com sucesso.
    *   `errorCount`: Número de linhas que resultaram em erro.
    *   `errors`: Um array com os detalhes de cada erro (limitado em exibição no frontend).

## 5. Feedback de Sucesso/Erro no Frontend

1.  **Recebimento do Sumário:** O frontend recebe o objeto de sumário do backend.
2.  **Exibição dos Resultados:**
    *   O modal de importação atualiza sua interface para mostrar o sumário:
        *   Número de leads importados com sucesso.
        *   Número de linhas com erro.
        *   Se houver erros, uma lista dos primeiros 10 erros é exibida, mostrando o número da linha no CSV e a mensagem de erro específica (ex: "Email já existe", "Telefone inválido").
    *   Uma mensagem de toast (notificação) informa o resultado geral da importação.
3.  **Ações Posteriores:**
    *   O usuário pode optar por "Importar Novo Arquivo" (que reseta o estado do modal) ou "Fechar".
    *   Se a importação foi bem-sucedida (parcial ou totalmente), a função `onImportSuccess` (passada como prop para o modal) é chamada. Isso geralmente dispara uma atualização da lista de leads na página principal para refletir os novos leads importados.

Este fluxo garante que a importação de leads seja um processo controlado, com validações importantes para manter a qualidade dos dados e feedback claro para o usuário sobre o resultado da operação.
