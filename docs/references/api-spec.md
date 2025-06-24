# Especificação da API do CRM Imobiliário

Este documento detalha os endpoints da API RESTful do CRM Imobiliário, incluindo informações sobre autenticação, estruturas de payload e exemplos de requisição/resposta.

## 1. Informações Gerais

*   **URL Base da API:** A URL base para todas as chamadas de API depende do ambiente.
    *   Localmente (desenvolvimento): `http://localhost:5000/api`
    *   Produção: `https://<seu-dominio-de-backend>.up.railway.app/api` (Exemplo para Railway)
*   **Formato dos Dados:** Todas as requisições e respostas utilizam o formato JSON.
*   **Autenticação:** A maioria dos endpoints requer autenticação via JSON Web Token (JWT).

## 2. Autenticação

A autenticação é gerenciada através de JWTs. Um token válido deve ser incluído no header `Authorization` de cada requisição para endpoints protegidos.

*   **Header de Autenticação:** `Authorization: Bearer <SEU_TOKEN_JWT>`

### Endpoints de Autenticação

#### `POST /auth/login`

Autentica um usuário com e-mail e senha.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/auth/login`
    *   Corpo (JSON):
        ```json
        {
          "email": "usuario@exemplo.com",
          "senha": "sua_senha_secreta"
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "60d5f1f772b4e2001f3e8c8b",
        "nome": "Nome do Usuário",
        "email": "usuario@exemplo.com",
        "perfil": "admin", // ou "corretor"
        "companyId": "60d5f1c372b4e2001f3e8c8a"
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se e-mail ou senha não forem fornecidos.
    ```json
    {
      "error": "Email e senha são obrigatórios."
    }
    ```
*   **Resposta de Erro (401 Unauthorized):** Se as credenciais forem inválidas.
    ```json
    {
      "error": "Credenciais inválidas."
    }
    ```

#### `POST /auth/google/callback`

Processa o código de autorização do Google Sign-In (fornecido pelo frontend após o usuário autenticar com o Google) para autenticar ou registrar um usuário. O usuário já deve existir no sistema CRM; esta rota não cria novos usuários automaticamente a partir do login Google.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/auth/google/callback`
    *   Corpo (JSON):
        ```json
        {
          "code": "CODIGO_DE_AUTORIZACAO_RECEBIDO_DO_GOOGLE_PELO_FRONTEND"
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Mesma estrutura do login normal)
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "60d5f1f772b4e2001f3e8c8b",
        "nome": "Nome do Usuário via Google",
        "email": "usuario.google@exemplo.com",
        "perfil": "corretor",
        "companyId": "60d5f1c372b4e2001f3e8c8a"
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o código do Google não for fornecido.
    ```json
    {
      "error": "Código de autorização Google não fornecido."
    }
    ```
*   **Resposta de Erro (401 Unauthorized):** Se a autenticação Google falhar (código inválido, usuário não cadastrado no CRM, etc.).
    ```json
    {
      "error": "Autenticação Google falhou." // ou mensagem mais específica
    }
    ```

## 3. Usuários (`/users`)

Endpoints para gerenciar usuários do sistema. A maioria dessas rotas requer perfil de `admin`.

*   **Middleware de Proteção:** Todos os endpoints `/api/users/*` requerem autenticação (header `Authorization: Bearer <token>`).

### `GET /users`

Lista todos os usuários ativos da empresa do usuário autenticado.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/users`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f1f772b4e2001f3e8c8b",
        "nome": "Usuário Admin",
        "email": "admin@exemplo.com",
        "perfil": "admin",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "createdAt": "2023-01-01T12:00:00.000Z",
        "updatedAt": "2023-01-01T12:00:00.000Z"
      },
      {
        "_id": "60d5f20e72b4e2001f3e8c8c",
        "nome": "Usuário Corretor",
        "email": "corretor@exemplo.com",
        "perfil": "corretor",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "createdAt": "2023-01-02T10:00:00.000Z",
        "updatedAt": "2023-01-02T10:00:00.000Z"
      }
    ]
    ```
*   **Resposta de Erro (401 Unauthorized):** Se o token for inválido ou não fornecido, ou se a empresa do usuário não for identificada.

### `POST /users`

Cria um novo usuário para a empresa do usuário autenticado. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/users`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Novo Usuário",
          "email": "novousuario@exemplo.com",
          "perfil": "corretor" // ou "admin"
          // A senha não é definida aqui; o usuário pode precisar de um fluxo de "esqueci senha" ou ser criada via Google.
          // A 'company' é inferida do token do admin.
        }
        ```
*   **Resposta de Sucesso (201 Created):**
    ```json
    {
      "_id": "60d5f22572b4e2001f3e8c8d",
      "nome": "Novo Usuário",
      "email": "novousuario@exemplo.com",
      "perfil": "corretor",
      "company": "60d5f1c372b4e2001f3e8c8a",
      "ativo": true,
      "googleId": null,
      "createdAt": "2023-01-03T14:00:00.000Z",
      "updatedAt": "2023-01-03T14:00:00.000Z"
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se dados obrigatórios (nome, email, perfil) não forem fornecidos ou forem inválidos.
*   **Resposta de Erro (401 Unauthorized):** Token admin inválido.
*   **Resposta de Erro (403 Forbidden):** Se o usuário autenticado não for admin.
*   **Resposta de Erro (409 Conflict):** Se o e-mail já estiver em uso.

### `GET /users/:id`

Busca um usuário específico pelo ID, dentro da empresa do usuário autenticado.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/users/60d5f20e72b4e2001f3e8c8c`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "_id": "60d5f20e72b4e2001f3e8c8c",
      "nome": "Usuário Corretor",
      "email": "corretor@exemplo.com",
      "perfil": "corretor",
      "company": "60d5f1c372b4e2001f3e8c8a",
      "ativo": true,
      "createdAt": "2023-01-02T10:00:00.000Z",
      "updatedAt": "2023-01-02T10:00:00.000Z"
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o ID for inválido.
*   **Resposta de Erro (401 Unauthorized):** Token inválido.
*   **Resposta de Erro (404 Not Found):** Se o usuário não for encontrado ou não pertencer à empresa do requisitante.

### `PUT /users/:id`

Atualiza um usuário existente. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/users/60d5f20e72b4e2001f3e8c8c`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - enviar apenas campos a serem alterados):
        ```json
        {
          "nome": "Nome do Corretor Atualizado",
          "perfil": "admin",
          "ativo": false,
          "senha": "novaSenhaSegura123" // Opcional: para definir/alterar senha local
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o usuário atualizado)
    ```json
    {
      "_id": "60d5f20e72b4e2001f3e8c8c",
      "nome": "Nome do Corretor Atualizado",
      "email": "corretor@exemplo.com", // Email não pode ser alterado se já existir em outro user
      "perfil": "admin",
      "company": "60d5f1c372b4e2001f3e8c8a",
      "ativo": false,
      "createdAt": "2023-01-02T10:00:00.000Z",
      "updatedAt": "2023-01-03T15:00:00.000Z"
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o ID for inválido, dados inválidos (ex: senha curta), ou nenhum dado para atualizar.
*   **Resposta de Erro (401 Unauthorized):** Token admin inválido.
*   **Resposta de Erro (403 Forbidden):** Se o usuário autenticado não for admin.
*   **Resposta de Erro (404 Not Found):** Se o usuário não for encontrado na empresa do admin.
*   **Resposta de Erro (409 Conflict):** Se o novo e-mail já estiver em uso por outro usuário.

### `DELETE /users/:id`

Exclui um usuário. Requer perfil de `admin`.

*   **Restrições:**
    *   Não é possível excluir um usuário se ele for responsável por leads.
    *   Não é possível excluir o único administrador da empresa.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/users/60d5f20e72b4e2001f3e8c8c`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Usuário \"Nome do Corretor\" excluído com sucesso."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o ID for inválido ou se houver restrições (ex: usuário é responsável por leads, é o único admin).
*   **Resposta de Erro (401 Unauthorized):** Token admin inválido.
*   **Resposta de Erro (403 Forbidden):** Se o usuário autenticado não for admin.
*   **Resposta de Erro (404 Not Found):** Se o usuário não for encontrado na empresa do admin.

---
*(Mais seções da API serão adicionadas abaixo: Leads, Empreendimentos, Propostas, etc.)*

## 4. Leads (`/leads`)

Endpoints para gerenciar leads.

*   **Middleware de Proteção:** Todos os endpoints `/api/leads/*` (exceto `/csv-template` e `/importar-csv` que têm sua própria lógica de auth/admin) requerem autenticação (`Authorization: Bearer <token>`).

### `GET /leads`

Lista todos os leads da empresa do usuário autenticado, com suporte a filtros e paginação.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/leads`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `page` (Number): Número da página para paginação (default: 1).
        *   `limit` (Number): Número de itens por página (default: 1000).
        *   `termoBusca` (String): Termo para buscar em nome, email, CPF ou contato do lead.
        *   `origem` (String - ObjectId): Filtra por ID da origem.
        *   `responsavel` (String - ObjectId): Filtra por ID do usuário responsável.
        *   `tags` (String): Lista de tags separadas por vírgula (ex: "vip,investidor").
        *   `dataInicio` (String - YYYY-MM-DD): Data de início para filtrar por data de criação.
        *   `dataFim` (String - YYYY-MM-DD): Data de fim para filtrar por data de criação.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "leads": [
        {
          "_id": "60d5f2a972b4e2001f3e8c8e",
          "nome": "Lead Exemplo 1",
          "contato": "+5511999998888",
          "email": "lead1@exemplo.com",
          "cpf": "12345678900",
          "situacao": {
            "_id": "60d5f0c072b4e2001f3e8c80",
            "nome": "Novo",
            "ordem": 1
          },
          "origem": {
            "_id": "60d5f0d072b4e2001f3e8c82",
            "nome": "Website"
          },
          "responsavel": {
            "_id": "60d5f1f772b4e2001f3e8c8b",
            "nome": "Usuário Admin",
            "perfil": "admin"
          },
          "company": "60d5f1c372b4e2001f3e8c8a",
          "tags": ["importante", "follow-up"],
          "coadquirentes": [
            {
              "nome": "Coadquirente Exemplo",
              "cpf": "09876543211"
            }
          ],
          "createdAt": "2023-01-04T10:00:00.000Z",
          "updatedAt": "2023-01-04T11:00:00.000Z"
        }
      ],
      "totalLeads": 1,
      "totalPages": 1,
      "currentPage": 1
    }
    ```
*   **Resposta de Erro (401 Unauthorized):** Token inválido ou empresa não identificada.
*   **Resposta de Erro (500 Internal Server Error):** Erro ao buscar leads.

### `POST /leads`

Cria um novo lead.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/leads`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Novo Lead via API",
          "contato": "+5521988887777", // Obrigatório
          "email": "novo.lead.api@exemplo.com", // Obrigatório, único por empresa
          "cpf": "11122233300", // Opcional, único por empresa
          "rg": "1234567",
          "nacionalidade": "Brasileiro(a)",
          "estadoCivil": "Solteiro(a)",
          "profissao": "Desenvolvedor",
          "nascimento": "1990-05-15", // YYYY-MM-DD
          "endereco": "Rua Exemplo, 123, Cidade, Estado",
          "comentario": "Lead interessado no empreendimento X.",
          "origem": "60d5f0d072b4e2001f3e8c82", // ObjectId da Origem (opcional, usa padrão se não enviado)
          "responsavel": "60d5f1f772b4e2001f3e8c8b", // ObjectId do Usuário (opcional, usa usuário logado ou admin padrão se não enviado)
          "situacao": "60d5f0c072b4e2001f3e8c80", // ObjectId da LeadStage (opcional, usa padrão se não enviado)
          "tags": ["api", "novo"],
          "coadquirentes": [
            {
              "nome": "Coadquirente 1",
              "cpf": "44455566600",
              "email": "co1@example.com"
            }
          ]
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o lead criado)
    ```json
    {
      "_id": "60d5f2c372b4e2001f3e8c8f",
      "nome": "Novo Lead via API",
      // ... demais campos do lead ...
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se dados obrigatórios (nome, contato) não forem fornecidos, ou se houver erro de validação (email/CPF inválido, ID de origem/situação/responsável não encontrado na empresa).
*   **Resposta de Erro (401 Unauthorized):** Token inválido ou usuário/empresa não identificados.
*   **Resposta de Erro (409 Conflict):** Se já existir um lead com o mesmo e-mail, contato ou CPF na empresa.

### `GET /leads/:id`

Busca um lead específico pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/leads/60d5f2a972b4e2001f3e8c8e`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto completo do lead, similar ao da listagem)
*   **Resposta de Erro (400 Bad Request):** ID de lead inválido.
*   **Resposta de Erro (401 Unauthorized):** Token inválido.
*   **Resposta de Erro (404 Not Found):** Lead não encontrado na empresa do usuário.

### `PUT /leads/:id`

Atualiza um lead existente.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/leads/60d5f2a972b4e2001f3e8c8e`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON - enviar apenas campos a serem alterados):
        ```json
        {
          "nome": "Lead Exemplo Atualizado",
          "situacao": "60d5f0c872b4e2001f3e8c81", // Novo ObjectId da LeadStage
          "comentario": "Atualização de comentário.",
          "tags": ["importante", "contatado"]
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o lead atualizado)
*   **Resposta de Erro (400 Bad Request):** ID inválido, dados de atualização inválidos (ex: ID de situação não existe).
*   **Resposta de Erro (401 Unauthorized):** Token inválido.
*   **Resposta de Erro (404 Not Found):** Lead não encontrado na empresa.
*   **Resposta de Erro (409 Conflict):** Se a atualização resultar em duplicidade de e-mail, contato ou CPF.

### `DELETE /leads/:id`

Exclui permanentemente um lead. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/leads/60d5f2a972b4e2001f3e8c8e`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Lead deletado com sucesso"
    }
    ```
*   **Resposta de Erro (400 Bad Request):** ID inválido.
*   **Resposta de Erro (401 Unauthorized):** Token admin inválido.
*   **Resposta de Erro (403 Forbidden):** Usuário não é admin.
*   **Resposta de Erro (404 Not Found):** Lead não encontrado na empresa.

### `PUT /leads/descartar/:id`

Descarta um lead, movendo-o para uma situação "Descartado" e registrando o motivo.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/leads/descartar/60d5f2a972b4e2001f3e8c8e`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "motivoDescarte": "60d5f0e072b4e2001f3e8c84", // ObjectId do DiscardReason (obrigatório)
          "comentario": "Lead não demonstrou interesse após contato." // Opcional
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o lead atualizado com a nova situação e motivo de descarte)
*   **Resposta de Erro (400 Bad Request):** ID de lead inválido, ID de motivo de descarte inválido ou não fornecido, ou motivo de descarte não encontrado na empresa.
*   **Resposta de Erro (401 Unauthorized):** Token inválido.
*   **Resposta de Erro (404 Not Found):** Lead não encontrado na empresa.

### `GET /leads/:id/history`

Busca o histórico de alterações de um lead específico.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/leads/60d5f2a972b4e2001f3e8c8e/history`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f30072b4e2001f3e8c90",
        "lead": "60d5f2a972b4e2001f3e8c8e",
        "user": "60d5f1f772b4e2001f3e8c8b", // ObjectId do usuário que realizou a ação, ou null
        "action": "CRIACAO", // Ex: CRIACAO, ATUALIZACAO, DESCARTE, etc.
        "details": "Lead criado no sistema.",
        "createdAt": "2023-01-04T10:00:00.000Z",
        "updatedAt": "2023-01-04T10:00:00.000Z"
      },
      {
        "_id": "60d5f31072b4e2001f3e8c91",
        "lead": "60d5f2a972b4e2001f3e8c8e",
        "user": "60d5f1f772b4e2001f3e8c8b",
        "action": "ATUALIZACAO",
        "details": "Situação alterada de 'Novo' para 'Em Contato'.",
        "createdAt": "2023-01-04T11:00:00.000Z",
        "updatedAt": "2023-01-04T11:00:00.000Z"
      }
    ]
    ```
*   **Resposta de Erro (400 Bad Request):** ID de lead inválido.
*   **Resposta de Erro (401 Unauthorized):** Token inválido.
*   **Resposta de Erro (404 Not Found):** Lead não encontrado na empresa.

### `GET /leads/csv-template`

Fornece um arquivo CSV modelo para a importação de leads.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/leads/csv-template`
    *   **Autenticação:** Nenhuma (endpoint público).
*   **Resposta de Sucesso (200 OK):**
    *   `Content-Type: text/csv`
    *   `Content-Disposition: attachment; filename=modelo_importacao_leads.csv`
    *   Corpo: Conteúdo CSV com cabeçalhos: `nome,email,telefone,cpf,origem,situacao,comentario` e uma linha de exemplo.
*   **Resposta de Erro (500 Internal Server Error):** Se houver falha ao gerar o template.

### `POST /leads/importar-csv`

Importa leads a partir de um arquivo CSV. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/leads/importar-csv`
    *   Headers:
        *   `Authorization: Bearer <token_admin>`
        *   `Content-Type: multipart/form-data`
    *   Corpo (Form-data):
        *   `csvfile`: O arquivo CSV a ser importado.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "totalRows": 10,
        "importedCount": 8,
        "errorCount": 2,
        "errors": [
          {
            "line": 3,
            "error": "Email 'duplicado@exemplo.com' já existe no sistema.",
            "data": { "nome": "Lead Duplicado", "email": "duplicado@exemplo.com", "...": "..." }
          },
          {
            "line": 7,
            "error": "Número de telefone inválido: 123",
            "data": { "nome": "Lead Telefone Invalido", "telefone": "123", "...": "..." }
          }
        ]
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Nenhum arquivo enviado.
*   **Resposta de Erro (401 Unauthorized):** Token admin inválido.
*   **Resposta de Erro (403 Forbidden):** Usuário não é admin.
*   **Resposta de Erro (500 Internal Server Error):** Erro genérico durante a importação.

---
*(Mais seções da API serão adicionadas abaixo: Empreendimentos, Propostas, etc.)*

## 14. Contatos de Corretores/Imobiliárias (`/brokers`)

Endpoints para gerenciar contatos de corretores e imobiliárias parceiras.

*   **Middleware de Proteção:** Todos os endpoints `/api/brokers/*` requerem autenticação.

### `GET /brokers`

Lista todos os contatos de corretores/imobiliárias ativos da empresa.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/brokers`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f0f072b4e2001f3e8c86",
        "nome": "Corretor Parceiro Alpha",
        "contato": "11987654321",
        "email": "alpha@parceiro.com",
        "creci": "12345-F",
        "nomeImobiliaria": "Imobiliária Alpha",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true
      }
    ]
    ```

### `POST /brokers`

Cria um novo contato de corretor/imobiliária.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/brokers`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Nova Imobiliária Beta", // Obrigatório
          "contato": "21977776666",
          "email": "beta@parceiro.com", // Único por empresa (se fornecido)
          "creci": "67890-J", // Único por empresa (se fornecido)
          "nomeImobiliaria": "Imobiliária Beta Ltda",
          "cpfCnpj": "12345678000199"
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o contato criado)
*   **Resposta de Erro (400 Bad Request):** Nome obrigatório ou dados inválidos.
*   **Resposta de Erro (409 Conflict):** Email ou CRECI já existem na empresa.

### `GET /brokers/:id`

Busca um contato de corretor/imobiliária pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/brokers/60d5f0f072b4e2001f3e8c86`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto do contato)
*   **Resposta de Erro (404 Not Found):** Contato não encontrado na empresa.

### `PUT /brokers/:id`

Atualiza um contato de corretor/imobiliária. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/brokers/60d5f0f072b4e2001f3e8c86`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "contato": "11999990000",
          "ativo": false
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o contato atualizado)
*   **Resposta de Erro (404 Not Found):** Contato não encontrado.
*   **Resposta de Erro (409 Conflict):** Conflito de email ou CRECI.

### `DELETE /brokers/:id`

Exclui um contato de corretor/imobiliária. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/brokers/60d5f0f072b4e2001f3e8c86`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Contato \"Nome do Contato\" excluído com sucesso."
    }
    ```
*   **Resposta de Erro (404 Not Found):** Contato não encontrado.
*   **Nota:** O serviço atualmente não impede a exclusão se o corretor estiver vinculado a propostas (isso pode ser uma melhoria futura).

## 15. Empresa (`/companies`)

Endpoint para criar uma nova empresa. Geralmente usado no setup inicial.

### `POST /companies`

Cria uma nova empresa.

*   **Autenticação:** Nenhuma (endpoint público para permitir o cadastro inicial de empresas).
*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/companies`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Minha Construtora Inc.", // Obrigatório
          "cnpj": "00.111.222/0001-33" // Obrigatório, será validado e limpo
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o objeto da empresa criada)
    ```json
    {
      "_id": "60d5f1c372b4e2001f3e8c8a",
      "nome": "Minha Construtora Inc.",
      "cnpj": "00111222000133",
      "ativo": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Nome ou CNPJ obrigatórios, ou CNPJ inválido.
*   **Resposta de Erro (409 Conflict):** CNPJ já cadastrado.

## 16. Dashboard (`/dashboard`)

Endpoints para buscar dados resumidos para o dashboard.

*   **Middleware de Proteção:** Todos os endpoints `/api/dashboard/*` requerem autenticação.

### `GET /dashboard/summary`

Retorna um resumo de dados de leads para o dashboard.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/dashboard/summary`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `filter` (String): Período do filtro ('month', 'year', 'all' - default 'month').
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "totalLeadsPeriodo": 50,
        "descartadosPeriodo": 5,
        "leadsUltimos7Dias": 10,
        "leadsByStage": [ { "_id": "...", "nome": "Novo", "count": 20, "ordem": 0 } /*, ... */ ],
        "leadsByOrigem": [ { "_id": "...", "nome": "Website", "count": 15 } /*, ... */ ],
        "leadsByResponsavel": [ { "_id": "...", "nome": "Corretor João", "count": 25 } /*, ... */ ]
      }
    }
    ```

### `GET /dashboard/financeiro`

Retorna um resumo financeiro para o dashboard.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/dashboard/financeiro`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `filter` (String): Período do filtro ('month', 'year' - default 'month').
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "valorTotalVendidoPeriodo": 1500000,
        "numeroDeVendasPeriodo": 3,
        "ticketMedioPeriodo": 500000,
        "totalComissao": 75000,
        "totalComissaoPaga": 20000,
        "totalComissaoAPagar": 55000,
        "valorTotalEmPropostasAtivas": 800000,
        "numeroDePropostasAtivas": 5,
        "vendasPorMes": [ { "_id": { "year": 2023, "month": 1 }, "totalVendido": 500000, "count": 1 } /*, ... */ ],
        "funilPorValor": [ { "_id": "Em Elaboração", "valorTotal": 300000, "count": 2 } /*, ... */ ]
      }
    }
    ```

### `GET /dashboard/advanced-metrics`

Retorna métricas avançadas de conversão e desempenho.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/dashboard/advanced-metrics`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `filter` (String): Período do filtro ('month', 'year', 'all' - default 'month').
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "conversionRate": 10.5, // Percentual
        "avgConversionTime": 15.2, // Dias
        "leadsByDayHour": [ { "day": 2, "hour": 10, "count": 5 } /* ... (1=Dom, 2=Seg) */ ],
        "stageFunnelData": [
          { "name": "Novo", "value": 100 },
          { "name": "Em Atendimento", "value": 60 },
          { "name": "Proposta", "value": 30 },
          { "name": "Vendido", "value": 10 }
        ]
      }
    }
    ```

### `GET /dashboard/financeiro-detalhado`

Retorna um resumo financeiro detalhado com mais opções de filtro.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/dashboard/financeiro-detalhado`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `dataInicio` (String - YYYY-MM-DD)
        *   `dataFim` (String - YYYY-MM-DD)
        *   `responsavelId` (String - ObjectId)
        *   `statusComissao` (String - ex: "Paga", "A Pagar")
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "totalVendido": 2000000,
        "totalComissao": 100000,
        "vendasAoLongoDoTempo": [ { "data": "2023-01", "valor": 800000 } /*, ... */ ],
        "comissoesPorResponsavel": [
          {
            "responsavelId": "...",
            "responsavelNome": "Corretor Silva",
            "totalVendido": 1200000,
            "comissaoTotal": 60000,
            "comissaoPaga": 30000,
            "comissaoAPagar": 30000,
            "totalVendas": 2
          }
          /*, ... */
        ]
      }
    }
    ```

## 17. Integrações (`/integrations`)

Endpoints para gerenciar integrações com serviços externos como Facebook e Google.

*   **Middleware de Proteção:** Todos os endpoints `/api/integrations/*` requerem autenticação.

### `POST /integrations/facebook/connect-page`

Conecta uma Página do Facebook à empresa no CRM, obtendo tokens de acesso e inscrevendo a página em webhooks de `leadgen`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/integrations/facebook/connect-page`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "pageId": "FACEBOOK_PAGE_ID_SELECIONADA_PELO_USUARIO",
          "accessToken": "USER_ACCESS_TOKEN_DE_CURTA_DURACAO_OBTIDO_NO_FRONTEND"
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Página <pageId> conectada e configurada para receber leads!"
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Dados insuficientes, token inválido, falha na configuração do webhook, ou página já conectada a outra empresa.

### `GET /integrations/facebook/status`

Verifica o status da integração com o Facebook para a empresa.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/integrations/facebook/status`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    *   Se conectado:
        ```json
        {
          "isConnected": true,
          "pageId": "ID_DA_PAGINA_CONECTADA",
          "pageName": "Nome da Página Conectada",
          "linkedForms": [ { "formId": "...", "formName": "..." } /*, ... */ ]
        }
        ```
    *   Se não conectado:
        ```json
        {
          "isConnected": false
        }
        ```

### `POST /integrations/facebook/disconnect`

Desconecta a Página do Facebook da empresa, removendo a inscrição do webhook e limpando os tokens.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/integrations/facebook/disconnect`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Página do Facebook (ID: <pageId>) desconectada e dados limpos no CRM."
    }
    ```

### `GET /integrations/facebook/pages/:pageId/forms`

Lista os formulários de Lead Ads de uma página específica do Facebook.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/integrations/facebook/pages/ID_DA_PAGINA/forms`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "id": "ID_DO_FORMULARIO_FB_1",
        "name": "Formulário Campanha Verão",
        "status": "ACTIVE",
        "locale": "pt_BR",
        "created_time": "..."
      }
      /*, ... */
    ]
    ```
*   **Resposta de Erro (400/404 Bad Request):** Página não conectada ou erro ao buscar formulários.

### `POST /integrations/facebook/pages/:pageId/linked-forms`

Salva a lista de formulários do Facebook selecionados pela empresa para sincronização de leads.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/integrations/facebook/pages/ID_DA_PAGINA/linked-forms`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "linkedForms": [
            { "formId": "ID_DO_FORMULARIO_FB_1", "formName": "Formulário Campanha Verão" },
            { "formId": "ID_DO_FORMULARIO_FB_2", "formName": "Formulário Contato Geral" }
          ]
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Seleção de formulários salva com sucesso!",
      "linkedFormsCount": 2
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Payload inválido ou página não corresponde à conectada.

### `POST /integrations/google/sync-contacts`

(Endpoint obsoleto/substituído por `list-contacts` e `import-selected-contacts`)
Sincroniza contatos do Google do usuário autenticado, criando leads no CRM para contatos que ainda não existem.

*   **Nota:** Esta rota parece ter sido substituída por uma abordagem mais seletiva.
*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/integrations/google/sync-contacts`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Sincronização de contatos do Google concluída.",
      "summary": {
        "totalContactsProcessed": 100,
        "leadsImported": 10,
        "duplicatesSkipped": 5,
        "othersSkipped": 85
      }
    }
    ```
*   **Resposta de Erro (401 Unauthorized):** Usuário não conectado ao Google ou falha na autorização.

### `GET /integrations/google/list-contacts`

Lista os contatos do Google do usuário, pré-filtrando aqueles que já existem como leads na empresa.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/integrations/google/list-contacts`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "googleContactId": "people/c123...",
        "displayName": "Contato Google Exemplo",
        "email": "contato.google@example.com",
        "phone": "+5531977776666", // Formatado para E.164
        "notes": "Anotações do contato",
        "organization": "Empresa do Contato"
      }
      /*, ... */
    ]
    ```
*   **Resposta de Erro (401 Unauthorized):** Usuário não conectado ao Google ou falha na autorização.

### `POST /integrations/google/import-selected-contacts`

Importa uma lista de contatos do Google (previamente listados e selecionados pelo usuário no frontend) como leads.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/integrations/google/import-selected-contacts`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "selectedContacts": [
            {
              "displayName": "Contato Google Selecionado 1",
              "email": "selecionado1@example.com",
              "phone": "+5511955554444",
              "notes": "Interessado no produto Y",
              "organization": "Empresa Y"
            }
            // ... outros contatos selecionados
          ]
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Importação de contatos do Google processada.",
      "summary": {
        "totalProcessed": 1,
        "leadsImported": 1,
        "duplicatesSkipped": 0,
        "errorsEncountered": 0
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Nenhum contato selecionado.
*   **Resposta de Erro (401 Unauthorized):** Usuário não conectado ao Google.

## 18. Webhooks (`/webhooks`)

Endpoints para receber notificações de webhooks de serviços externos.

### `GET /webhooks/facebook/leads`

Endpoint de verificação para o webhook de leads do Facebook.

*   **Autenticação:** Verificação baseada em `hub.mode`, `hub.verify_token` e `hub.challenge` query params.
*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/webhooks/facebook/leads?hub.mode=subscribe&hub.challenge=CHALLENGE_STRING&hub.verify_token=SEU_VERIFY_TOKEN`
*   **Resposta de Sucesso (200 OK):**
    *   Corpo: `CHALLENGE_STRING` (o mesmo recebido na query).
*   **Resposta de Erro (403 Forbidden):** Se `hub.mode` não for "subscribe" ou `hub.verify_token` não bater com o configurado no ambiente.

### `POST /webhooks/facebook/leads`

Recebe notificações de novos leads gerados via formulários do Facebook Lead Ads.

*   **Autenticação:** Validação da assinatura `x-hub-signature-256` usando o `FB_APP_SECRET`.
*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/webhooks/facebook/leads`
    *   Headers: `X-Hub-Signature-256: sha256=<hash_da_assinatura>`
    *   Corpo (JSON - Payload do Facebook):
        ```json
        {
          "object": "page",
          "entry": [
            {
              "id": "PAGE_ID_QUE_GEROU_O_EVENTO",
              "time": 1678886400,
              "changes": [
                {
                  "field": "leadgen",
                  "value": {
                    "leadgen_id": "ID_DO_LEAD_GERADO",
                    "form_id": "ID_DO_FORMULARIO_PREENCHIDO",
                    "page_id": "PAGE_ID_QUE_GEROU_O_EVENTO",
                    "ad_id": "ID_DO_ANUNCIO (se aplicável)",
                    "created_time": 1678886390,
                    "field_data": [ // Dados preenchidos pelo usuário
                      { "name": "full_name", "values": ["Nome Completo do Lead"] },
                      { "name": "email", "values": ["email@exemplo.com"] },
                      { "name": "phone_number", "values": ["+5511999998888"] }
                      // ... outros campos do formulário
                    ]
                  }
                }
              ]
            }
          ]
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Enviada imediatamente ao Facebook, mesmo que o processamento do lead falhe internamente, para evitar que o Facebook reenvie a notificação).
*   **Resposta de Erro (403 Forbidden):** Se a assinatura do webhook for inválida.
*   **Lógica Interna:**
    *   O serviço identifica a `Company` no CRM com base no `page_id` recebido.
    *   Verifica se o `form_id` está entre os formulários vinculados pela empresa (se a empresa selecionou formulários específicos).
    *   Extrai os dados do lead (`full_name`, `email`, `phone_number`, etc.).
    *   Tenta criar um novo lead no CRM, associando-o à origem "Facebook Ads" e ao responsável configurado (ou padrão).
    *   Evita duplicidade com base no número de telefone.

---
*(Fim das seções da API.)*

## 11. Reservas (`/reservas`)

Endpoints para gerenciar reservas de imóveis (Unidades ou Imóveis Avulsos).

*   **Middleware de Proteção:** Todos os endpoints `/api/reservas/*` requerem autenticação.

### `GET /reservas`

Lista todas as reservas da empresa do usuário autenticado, com filtros e paginação.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/reservas`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `page` (Number): Página (default: 1).
        *   `limit` (Number): Itens por página (default: 10).
        *   `statusReserva` (String): Filtra por status da reserva (ex: "Ativa").
        *   `leadId` (String - ObjectId): Filtra por ID do lead.
        *   `imovelId` (String - ObjectId): Filtra por ID do imóvel.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "reservas": [
        {
          "_id": "60d5fa8f72b4e2001f3e8ca7",
          "lead": { "_id": "...", "nome": "Lead da Reserva" },
          "imovel": { "_id": "...", "identificador": "Apto 101" /* ou "titulo" para ImovelAvulso */ },
          "tipoImovel": "Unidade", // ou "ImovelAvulso"
          "empreendimento": { "nome": "Residencial Jardins" }, // "Avulso" para ImovelAvulso
          "dataReserva": "2023-02-01T10:00:00.000Z",
          "validadeReserva": "2023-02-08T23:59:59.000Z",
          "statusReserva": "Ativa",
          "company": "60d5f1c372b4e2001f3e8c8a",
          "createdBy": { "_id": "...", "nome": "Usuário Criador" }
        }
      ],
      "total": 1,
      "totalPages": 1,
      "currentPage": 1
    }
    ```

### `POST /reservas`

Cria uma nova reserva para um lead em um imóvel específico.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/reservas`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "leadId": "60d5f2a972b4e2001f3e8c8e", // Obrigatório
          "imovelId": "60d5f85972b4e2001f3e8ca2", // Obrigatório
          "tipoImovel": "Unidade", // Obrigatório ("Unidade" ou "ImovelAvulso")
          "validadeReserva": "2024-12-31", // Obrigatório (YYYY-MM-DD)
          "valorSinal": 5000.00, // Opcional
          "observacoesReserva": "Cliente pediu para aguardar aprovação de crédito." // Opcional
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna a reserva criada)
*   **Resposta de Erro (400 Bad Request):** Campos obrigatórios faltando, IDs inválidos, data de validade inválida, imóvel não disponível, ou já existe reserva ativa para o imóvel.
*   **Resposta de Erro (404 Not Found):** Lead ou imóvel não encontrados na empresa.

### `GET /reservas/:id`

Busca uma reserva específica pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/reservas/60d5fa8f72b4e2001f3e8ca7`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto da reserva, incluindo `companyData`)
*   **Resposta de Erro (404 Not Found):** Reserva não encontrada ou não pertence à empresa.

## 12. Propostas/Contratos (`/propostas-contratos`)

Endpoints para gerenciar propostas e contratos.

*   **Middleware de Proteção:** Todos os endpoints `/api/propostas-contratos/*` requerem autenticação.

### `POST /propostas-contratos/a-partir-da-reserva/:reservaId`

Cria uma nova Proposta/Contrato a partir de uma Reserva existente.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/propostas-contratos/a-partir-da-reserva/60d5fa8f72b4e2001f3e8ca7`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "adquirentesSnapshot": [ // Array de adquirentes (dados completos)
            {
              "nome": "Adquirente Principal",
              "cpf": "11122233300",
              "contato": "+5511999998888"
              // ... outros campos do adquirente
            }
          ],
          "valorPropostaContrato": 500000, // Obrigatório
          "valorEntrada": 50000,
          "planoDePagamento": [
            {
              "tipoParcela": "ATO",
              "quantidade": 1,
              "valorUnitario": 50000,
              "vencimentoPrimeira": "2024-01-15"
            },
            {
              "tipoParcela": "PARCELA MENSAL",
              "quantidade": 36,
              "valorUnitario": 12500,
              "vencimentoPrimeira": "2024-02-15"
            }
          ],
          "responsavelNegociacao": "60d5f1f772b4e2001f3e8c8b", // ObjectId do User (obrigatório)
          "corretagem": { // Opcional
            "valorCorretagem": 25000,
            "corretorPrincipal": "60d5f0f072b4e2001f3e8c86" // ObjectId do BrokerContact
          },
          "statusPropostaContrato": "Em Elaboração", // Opcional, default "Em Elaboração"
          "observacoesInternasProposta": "Negociação especial."
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna a proposta/contrato criada)
    *   O `corpoContratoHTMLGerado` inicialmente conterá uma mensagem placeholder.
*   **Resposta de Erro (400 Bad Request):** ID da reserva inválido, campos obrigatórios faltando, ou reserva não está "Ativa".
*   **Resposta de Erro (404 Not Found):** Reserva não encontrada.

### `GET /propostas-contratos/:id`

Busca uma Proposta/Contrato específica pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto da proposta/contrato, populado com dados relacionados como lead, imóvel, empresa vendedora, etc.)

### `PUT /propostas-contratos/:id`

Atualiza uma Proposta/Contrato existente. Usado para salvar alterações nos dados da proposta, incluindo o `corpoContratoHTMLGerado` após edição.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "valorPropostaContrato": 510000,
          "corpoContratoHTMLGerado": "<html><body>Conteúdo HTML atualizado do contrato...</body></html>",
          "modeloContratoUtilizado": "60d60d3572b4e2001f3e8caf" // ObjectId do ModeloContrato
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a proposta/contrato atualizada)
*   **Resposta de Erro (400 Bad Request):** Dados inválidos (ex: somatório de parcelas não bate com valor total).
*   **Resposta de Erro (404 Not Found):** Proposta/Contrato não encontrada.

### `GET /propostas-contratos/:id/pdf`

Gera e faz o download do PDF de uma Proposta/Contrato. Utiliza o `corpoContratoHTMLGerado` salvo.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9/pdf`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    *   `Content-Type: application/pdf`
    *   `Content-Disposition: attachment; filename=proposta_contrato_<id>.pdf`
    *   Corpo: Binário do arquivo PDF.
*   **Resposta de Erro (400 Bad Request):** ID inválido.
*   **Resposta de Erro (404 Not Found):** Proposta/Contrato não encontrada ou sem HTML gerado.
*   **Resposta de Erro (500 Internal Server Error):** Falha na geração do PDF (Puppeteer).

### `PUT /propostas-contratos/:id/status`

Atualiza o status de uma Proposta/Contrato. Esta ação pode desencadear atualizações em entidades relacionadas (Lead, Unidade, Reserva).

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9/status`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "novoStatus": "Assinado", // Obrigatório (enum: "Em Elaboração", "Aguardando Aprovações", ...)
          "dataAssinaturaCliente": "2024-02-10", // Opcional, relevante para status "Assinado" ou "Vendido"
          "dataVendaEfetivada": "2024-02-15" // Opcional, relevante para status "Vendido"
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a proposta/contrato atualizada)
*   **Resposta de Erro (400 Bad Request):** ID inválido, `novoStatus` obrigatório ou inválido.
*   **Resposta de Erro (404 Not Found):** Proposta/Contrato não encontrada.

### `PUT /propostas-contratos/:id/distrato`

Registra o distrato de uma Proposta/Contrato que estava "Vendido".

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9/distrato`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "motivoDistrato": "Cliente desistiu da compra por motivos pessoais.", // Obrigatório
          "dataDistrato": "2024-03-01", // Opcional, default: data atual
          "leadMotivoDescarteId": "60d5f0e072b4e2001f3e8c84" // Opcional: ID do motivo de descarte para o lead
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a proposta/contrato atualizada com status "Distrato Realizado")
*   **Resposta de Erro (400 Bad Request):** ID inválido, `motivoDistrato` obrigatório, ou proposta não está com status "Vendido".
*   **Resposta de Erro (404 Not Found):** Proposta/Contrato não encontrada.

### `POST /propostas-contratos/:id/gerar-documento`

Gera o HTML de um documento (proposta/contrato) com base em um modelo selecionado, preenchendo os placeholders. **Não salva o HTML gerado na proposta automaticamente.**

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/propostas-contratos/60d5fccb72b4e2001f3e8ca9/gerar-documento`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "modeloId": "60d60d3572b4e2001f3e8caf" // ObjectId do ModeloContrato (obrigatório)
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "htmlGerado": "<html><body>Conteúdo do contrato com placeholders preenchidos...</body></html>"
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** `modeloId` obrigatório.
*   **Resposta de Erro (404 Not Found):** Proposta ou Modelo de Contrato não encontrados.

## 13. Modelos de Contrato (`/modelos-contrato`)

Endpoints para gerenciar modelos de contrato que podem ser usados para gerar documentos. Requer perfil de `admin` para criar, atualizar e deletar.

*   **Middleware de Proteção:** Todos os endpoints `/api/modelos-contrato/*` requerem autenticação.

### `GET /modelos-contrato`

Lista todos os modelos de contrato ativos da empresa.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/modelos-contrato`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais): `page`, `limit`, filtros por `nomeModelo`, `tipoDocumento`.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "modelos": [
        {
          "_id": "60d60d3572b4e2001f3e8caf",
          "nomeModelo": "Contrato Padrão CV - Apartamento",
          "tipoDocumento": "Contrato de Compra e Venda",
          "company": "60d5f1c372b4e2001f3e8c8a",
          "ativo": true
          // conteudoHTMLTemplate e placeholdersDisponiveis geralmente não são retornados na listagem
        }
      ],
      "total": 1, "page": 1, "pages": 1
    }
    ```

### `POST /modelos-contrato`

Cria um novo modelo de contrato. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/modelos-contrato`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "nomeModelo": "Proposta Comercial - Terreno", // Obrigatório
          "tipoDocumento": "Proposta", // Obrigatório (enum)
          "conteudoHTMLTemplate": "<h1>Proposta para {{lead_principal_nome}}</h1><p>Detalhes do terreno {{imovel_identificador}}...</p>", // Obrigatório
          "placeholdersDisponiveis": [ // Opcional
            { "placeholder": "{{lead_principal_nome}}", "descricao": "Nome do comprador principal" }
          ],
          "ativo": true // Opcional, default true
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o modelo criado)
*   **Resposta de Erro (400 Bad Request):** Campos obrigatórios faltando.
*   **Resposta de Erro (MongoDB Duplicate Key):** Modelo com mesmo nome já existe na empresa.

### `GET /modelos-contrato/:id`

Busca um modelo de contrato específico pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/modelos-contrato/60d60d3572b4e2001f3e8caf`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto completo do modelo, incluindo `conteudoHTMLTemplate`)
*   **Resposta de Erro (404 Not Found):** Modelo não encontrado, inativo ou não pertence à empresa.

### `PUT /modelos-contrato/:id`

Atualiza um modelo de contrato existente. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/modelos-contrato/60d60d3572b4e2001f3e8caf`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "nomeModelo": "Contrato Padrão Compra e Venda - Apto Novo",
          "conteudoHTMLTemplate": "..." // Novo HTML
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o modelo atualizado)
*   **Resposta de Erro (400 Bad Request):** Dados inválidos.
*   **Resposta de Erro (404 Not Found):** Modelo não encontrado, inativo ou não pertence à empresa.
*   **Resposta de Erro (MongoDB Duplicate Key):** Se o novo nome já existir.

### `DELETE /modelos-contrato/:id`

Desativa (soft delete) um modelo de contrato. Requer perfil de `admin`.

*   **Restrição:** Não é possível desativar se o modelo estiver sendo usado por alguma Proposta/Contrato.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/modelos-contrato/60d60d3572b4e2001f3e8caf`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": { "message": "Modelo de contrato desativado com sucesso." }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o modelo estiver em uso.
*   **Resposta de Erro (404 Not Found):** Modelo não encontrado, já inativo ou não pertence à empresa.

---
*(Mais seções da API serão adicionadas abaixo: Empreendimentos, Propostas, etc.)*

## 8. Empreendimentos (`/empreendimentos`)

Endpoints para gerenciar empreendimentos imobiliários.

*   **Middleware de Proteção:** Todos os endpoints `/api/empreendimentos/*` requerem autenticação.
*   **Rotas Aninhadas para Unidades:** As unidades são gerenciadas como sub-recursos de empreendimentos. A rota `/api/empreendimentos/:empreendimentoId/unidades` é delegada para `unidadeRoutes.js`.

### `GET /empreendimentos`

Lista todos os empreendimentos ativos da empresa do usuário autenticado, com filtros e paginação.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/empreendimentos`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `page` (Number): Página (default: 1).
        *   `limit` (Number): Itens por página (default: 10).
        *   `nome` (String): Filtra por nome do empreendimento (case-insensitive, partial match).
        *   `tipo` (String): Filtra por tipo (ex: "Residencial Vertical").
        *   `statusEmpreendimento` (String): Filtra por status (ex: "Lançamento").
        *   `localizacao.cidade` (String): Filtra por cidade.
        *   `localizacao.uf` (String): Filtra por UF.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "empreendimentos": [
        {
          "_id": "60d5f7e772b4e2001f3e8ca1",
          "nome": "Residencial Jardins",
          "tipo": "Residencial Vertical",
          "statusEmpreendimento": "Em Obras",
          "localizacao": {
            "cidade": "São Paulo",
            "uf": "SP"
          },
          "company": "60d5f1c372b4e2001f3e8c8a",
          "ativo": true,
          "totalUnidades": 20, // Campo virtual populado
          "createdAt": "2023-01-10T00:00:00.000Z",
          "updatedAt": "2023-01-10T00:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "pages": 1
    }
    ```

### `POST /empreendimentos`

Cria um novo empreendimento.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/empreendimentos`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Condomínio Praças da Cidade", // Obrigatório
          "construtoraIncorporadora": "Construtora X",
          "localizacao": { // Obrigatório cidade e UF
            "logradouro": "Av. Principal",
            "numero": "1000",
            "bairro": "Centro",
            "cidade": "Rio de Janeiro", // Obrigatório
            "uf": "RJ", // Obrigatório
            "cep": "20000-000"
          },
          "tipo": "Residencial Horizontal", // Obrigatório (enum)
          "statusEmpreendimento": "Lançamento", // Obrigatório (enum)
          "descricao": "Casas de alto padrão em condomínio fechado.",
          "imagemPrincipal": {
            "url": "http://example.com/imagem.jpg",
            "altText": "Fachada do condomínio"
          },
          "dataPrevistaEntrega": "2025-12-31" // YYYY-MM-DD
        }
        ```
*   **Resposta de Sucesso (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        // Objeto do empreendimento criado
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Campos obrigatórios faltando ou dados inválidos.
*   **Resposta de Erro (MongoDB Duplicate Key):** Se já existir um empreendimento com o mesmo nome na empresa.

### `GET /empreendimentos/:id`

Busca um empreendimento específico pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        // Objeto do empreendimento
      }
    }
    ```
*   **Resposta de Erro (404 Not Found):** Empreendimento não encontrado, inativo ou não pertence à empresa.

### `PUT /empreendimentos/:id`

Atualiza um empreendimento existente.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "statusEmpreendimento": "Em Obras",
          "descricao": "Descrição atualizada."
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o empreendimento atualizado)
*   **Resposta de Erro (400 Bad Request):** Dados inválidos.
*   **Resposta de Erro (404 Not Found):** Empreendimento não encontrado, inativo ou não pertence à empresa.
*   **Resposta de Erro (MongoDB Duplicate Key):** Se o novo nome já existir em outro empreendimento da empresa.

### `DELETE /empreendimentos/:id`

Desativa (soft delete) um empreendimento. Também desativa todas as suas unidades associadas.

*   **Restrição:** Não é possível desativar se houver unidades não vendidas ou ativas.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Empreendimento desativado com sucesso."
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se houver unidades ativas/não vendidas.
*   **Resposta de Erro (404 Not Found):** Empreendimento não encontrado, já inativo ou não pertence à empresa.

## 9. Unidades (`/empreendimentos/:empreendimentoId/unidades`)

Endpoints para gerenciar as unidades de um empreendimento específico.

*   **Middleware de Proteção:** Todos os endpoints de unidades requerem autenticação.
*   **Rota Base:** `/api/empreendimentos/:empreendimentoId/unidades`

### `GET /empreendimentos/:empreendimentoId/unidades`

Lista todas as unidades ativas de um empreendimento específico, com filtros e paginação.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1/unidades`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `page` (Number): Página (default: 1).
        *   `limit` (Number): Itens por página (default: 100).
        *   `identificador` (String): Filtra por identificador da unidade.
        *   `statusUnidade` (String): Filtra por status (ex: "Disponível").
        *   `tipologia` (String): Filtra por tipologia.
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "unidades": [
        {
          "_id": "60d5f85972b4e2001f3e8ca2",
          "empreendimento": "60d5f7e772b4e2001f3e8ca1",
          "identificador": "Apto 101",
          "tipologia": "2 Quartos com Suíte",
          "areaUtil": 70.5,
          "precoTabela": 500000,
          "statusUnidade": "Disponível",
          "company": "60d5f1c372b4e2001f3e8c8a",
          "ativo": true
        }
      ],
      "total": 1,
      "page": 1,
      "pages": 1
    }
    ```
*   **Resposta de Erro (404 Not Found):** Empreendimento pai não encontrado ou não pertence à empresa.

### `POST /empreendimentos/:empreendimentoId/unidades`

Cria uma nova unidade para o empreendimento especificado.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1/unidades`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "identificador": "Bloco B - Casa 05", // Obrigatório
          "tipologia": "3 Quartos Duplex",
          "areaUtil": 120.0,
          "areaTotal": 150.0,
          "precoTabela": 850000,
          "statusUnidade": "Disponível", // Opcional, default "Disponível"
          "observacoesInternas": "Unidade de canto."
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna a unidade criada)
*   **Resposta de Erro (400 Bad Request):** Identificador obrigatório ou dados inválidos.
*   **Resposta de Erro (404 Not Found):** Empreendimento pai não encontrado, inativo ou não pertence à empresa.
*   **Resposta de Erro (MongoDB Duplicate Key):** Se já existir unidade com mesmo identificador no empreendimento.

### `GET /empreendimentos/:empreendimentoId/unidades/:unidadeId`

Busca uma unidade específica pelo ID, dentro do empreendimento.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1/unidades/60d5f85972b4e2001f3e8ca2`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto da unidade)
*   **Resposta de Erro (404 Not Found):** Unidade ou empreendimento não encontrados, ou não pertencem à empresa, ou unidade inativa.

### `PUT /empreendimentos/:empreendimentoId/unidades/:unidadeId`

Atualiza uma unidade existente.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1/unidades/60d5f85972b4e2001f3e8ca2`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "precoTabela": 520000,
          "statusUnidade": "Reservada"
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a unidade atualizada)
*   **Resposta de Erro (400 Bad Request):** Dados inválidos.
*   **Resposta de Erro (404 Not Found):** Unidade ou empreendimento não encontrados, ou não pertencem à empresa, ou unidade inativa.
*   **Resposta de Erro (MongoDB Duplicate Key):** Se o novo identificador já existir no empreendimento.

### `DELETE /empreendimentos/:empreendimentoId/unidades/:unidadeId`

Desativa (soft delete) uma unidade.

*   **Restrição:** Não é possível desativar se a unidade estiver "Reservada", "Proposta Aceita" ou "Vendido".
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/empreendimentos/60d5f7e772b4e2001f3e8ca1/unidades/60d5f85972b4e2001f3e8ca2`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Unidade desativada com sucesso."
      }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se a unidade estiver em um status que não permite desativação.
*   **Resposta de Erro (404 Not Found):** Unidade ou empreendimento não encontrados, já inativa ou não pertence à empresa.

## 10. Imóveis Avulsos (`/imoveis-avulsos`)

Endpoints para gerenciar imóveis que não pertencem a um empreendimento (ex: imóveis de terceiros).

*   **Middleware de Proteção:** Todos os endpoints `/api/imoveis-avulsos/*` requerem autenticação.

### `GET /imoveis-avulsos`

Lista todos os imóveis avulsos ativos da empresa, com filtros e paginação.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/imoveis-avulsos`
    *   Headers: `Authorization: Bearer <token>`
    *   Query Params (Opcionais):
        *   `page` (Number): Página (default: 1).
        *   `limit` (Number): Itens por página (default: 20).
        *   `cidade` (String): Filtra por cidade (case-insensitive, partial).
        *   `bairro` (String): Filtra por bairro (case-insensitive, partial).
        *   `tipoImovel` (String): Filtra por tipo (enum: 'Apartamento', 'Casa', etc.).
        *   `quartos` (Number): Filtra por número mínimo de quartos (gte).
        *   `status` (String): Filtra por status (enum: 'Disponível', 'Reservado', etc.).
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "imoveis": [
        {
          "_id": "60d5f8c572b4e2001f3e8ca3",
          "titulo": "Apartamento 3 Quartos no Centro",
          "tipoImovel": "Apartamento",
          "status": "Disponível",
          "preco": 750000,
          "endereco": { "cidade": "Curitiba", "uf": "PR", "bairro": "Centro" },
          "company": "60d5f1c372b4e2001f3e8c8a",
          "responsavel": { "_id": "...", "nome": "Corretor Responsável" }
        }
      ],
      "total": 1,
      "totalPages": 1,
      "currentPage": 1
    }
    ```

### `POST /imoveis-avulsos`

Cria um novo imóvel avulso.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/imoveis-avulsos`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON):
        ```json
        {
          "titulo": "Casa Térrea com Piscina", // Obrigatório
          "descricao": "Excelente casa com área de lazer completa.",
          "tipoImovel": "Casa", // Obrigatório (enum)
          "status": "Disponível", // Opcional, default "Disponível" (enum)
          "quartos": 4,
          "areaTotal": 300, // Obrigatório
          "preco": 1200000, // Obrigatório
          "endereco": { // Obrigatório cidade e uf
            "logradouro": "Rua das Palmeiras",
            "numero": "50",
            "bairro": "Jardim Flores",
            "cidade": "Campinas", // Obrigatório
            "uf": "SP" // Obrigatório
          },
          "fotos": [{ "url": "http://example.com/foto_casa.jpg" }]
          // "responsavel" é o usuário logado
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o imóvel criado)
*   **Resposta de Erro (400 Bad Request):** Campos obrigatórios faltando ou dados inválidos.

### `GET /imoveis-avulsos/:id`

Busca um imóvel avulso específico pelo ID.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/imoveis-avulsos/60d5f8c572b4e2001f3e8ca3`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):** (Retorna o objeto do imóvel)
*   **Resposta de Erro (404 Not Found):** Imóvel não encontrado ou não pertence à empresa.

### `PUT /imoveis-avulsos/:id`

Atualiza um imóvel avulso existente.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/imoveis-avulsos/60d5f8c572b4e2001f3e8ca3`
    *   Headers: `Authorization: Bearer <token>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "preco": 1150000,
          "status": "Reservado"
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o imóvel atualizado)
*   **Resposta de Erro (400 Bad Request):** Dados inválidos.
*   **Resposta de Erro (404 Not Found):** Imóvel não encontrado ou não pertence à empresa.

### `DELETE /imoveis-avulsos/:id`

Exclui um imóvel avulso.

*   **Restrição:** Não é possível excluir se o imóvel estiver "Reservado" ou "Vendido".
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/imoveis-avulsos/60d5f8c572b4e2001f3e8ca3`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": {} // Ou { message: "Imóvel excluído com sucesso." }
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se o imóvel estiver em um status que não permite exclusão.
*   **Resposta de Erro (404 Not Found):** Imóvel não encontrado ou não pertence à empresa.

---
*(Mais seções da API serão adicionadas abaixo: Empreendimentos, Propostas, etc.)*

## 5. Situações do Lead (`/leadstages`)

Endpoints para gerenciar as situações (estágios) do funil de vendas de leads. A maioria requer perfil de `admin`.

*   **Middleware de Proteção:** Todos os endpoints `/api/leadstages/*` requerem autenticação.

### `GET /leadstages`

Lista todas as situações de lead ativas da empresa do usuário autenticado, ordenadas por `ordem`.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/leadstages`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f0c072b4e2001f3e8c80",
        "nome": "Novo",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "ordem": 0,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      },
      {
        "_id": "60d5f0c872b4e2001f3e8c81",
        "nome": "Em Contato",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "ordem": 1,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ]
    ```

### `POST /leadstages`

Cria uma nova situação de lead. Requer perfil de `admin`. A `ordem` é calculada automaticamente.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/leadstages`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Qualificado",
          "ativo": true // Opcional, default true
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna a situação criada)
*   **Resposta de Erro (400 Bad Request):** Nome obrigatório ou inválido.
*   **Resposta de Erro (409 Conflict):** Situação com mesmo nome já existe na empresa.

### `PUT /leadstages/:id`

Atualiza uma situação de lead existente. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/leadstages/60d5f0c872b4e2001f3e8c81`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "nome": "Contato Realizado",
          "ativo": false
          // "ordem" não é atualizada por este endpoint, use PUT /leadstages/order
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a situação atualizada)
*   **Resposta de Erro (400 Bad Request):** ID inválido, nome inválido.
*   **Resposta de Erro (404 Not Found):** Situação não encontrada na empresa.
*   **Resposta de Erro (409 Conflict):** Novo nome já existe.
*   **Restrição:** Não é possível renomear a situação "Descartado" ou alterar sua ordem diretamente por este endpoint.

### `DELETE /leadstages/:id`

Exclui uma situação de lead. Requer perfil de `admin`.

*   **Restrições:**
    *   Não é possível excluir a situação "Descartado".
    *   Não é possível excluir se a situação estiver sendo usada por algum lead.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/leadstages/60d5f0c872b4e2001f3e8c81`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Situação \"Nome da Situacao\" excluída com sucesso."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** ID inválido.
*   **Resposta de Erro (404 Not Found):** Situação não encontrada.
*   **Resposta de Erro (409 Conflict):** Situação em uso ou é a "Descartado".

### `PUT /leadstages/order`

Atualiza a ordem de exibição de múltiplas situações de lead para a empresa. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/leadstages/order`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "orderedStageIds": [
            "60d5f0c072b4e2001f3e8c80", // ID da Situação "Novo"
            "60d5f0c872b4e2001f3e8c81", // ID da Situação "Em Contato"
            "..." // IDs das outras situações na ordem desejada
          ]
        }
        ```
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "message": "Ordem das situações atualizada com sucesso."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** Se `orderedStageIds` não for um array de ObjectIds válidos.

## 6. Origens do Lead (`/origens`)

Endpoints para gerenciar as origens dos leads (ex: Website, Indicação, Feira). A maioria requer perfil de `admin`.

*   **Middleware de Proteção:** Todos os endpoints `/api/origens/*` requerem autenticação.

### `GET /origens`

Lista todas as origens ativas da empresa do usuário autenticado, ordenadas por nome.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/origens`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f0d072b4e2001f3e8c82",
        "nome": "Website",
        "descricao": "Leads gerados através do formulário do site.",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ]
    ```

### `POST /origens`

Cria uma nova origem. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/origens`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Facebook Ads",
          "descricao": "Leads de campanhas no Facebook",
          "ativo": true // Opcional, default true
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna a origem criada)
*   **Resposta de Erro (400 Bad Request):** Nome obrigatório ou inválido.
*   **Resposta de Erro (409 Conflict):** Origem com mesmo nome já existe na empresa.

### `PUT /origens/:id`

Atualiza uma origem existente. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/origens/60d5f0d072b4e2001f3e8c82`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "nome": "Site Principal",
          "ativo": false
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna a origem atualizada)
*   **Resposta de Erro (400 Bad Request):** ID inválido, nome inválido.
*   **Resposta de Erro (404 Not Found):** Origem não encontrada na empresa.
*   **Resposta de Erro (409 Conflict):** Novo nome já existe.

### `DELETE /origens/:id`

Exclui uma origem. Requer perfil de `admin`.

*   **Restrição:** Não é possível excluir se a origem estiver sendo usada por algum lead.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/origens/60d5f0d072b4e2001f3e8c82`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "mensagem": "Origem \"Nome da Origem\" excluída com sucesso."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** ID inválido.
*   **Resposta de Erro (404 Not Found):** Origem não encontrada.
*   **Resposta de Erro (409 Conflict):** Origem em uso.

## 7. Motivos de Descarte (`/motivosdescarte`)

Endpoints para gerenciar os motivos de descarte de leads. A maioria requer perfil de `admin`.

*   **Middleware de Proteção:** Todos os endpoints `/api/motivosdescarte/*` requerem autenticação.

### `GET /motivosdescarte`

Lista todos os motivos de descarte ativos da empresa do usuário autenticado, ordenados por nome.

*   **Requisição:**
    *   Método: `GET`
    *   Endpoint: `/api/motivosdescarte`
    *   Headers: `Authorization: Bearer <token>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "_id": "60d5f0e072b4e2001f3e8c84",
        "nome": "Sem Interesse",
        "company": "60d5f1c372b4e2001f3e8c8a",
        "ativo": true,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ]
    ```

### `POST /motivosdescarte`

Cria um novo motivo de descarte. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `POST`
    *   Endpoint: `/api/motivosdescarte`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON):
        ```json
        {
          "nome": "Preço Alto",
          "ativo": true // Opcional, default true
        }
        ```
*   **Resposta de Sucesso (201 Created):** (Retorna o motivo criado)
*   **Resposta de Erro (400 Bad Request):** Nome obrigatório ou inválido.
*   **Resposta de Erro (409 Conflict):** Motivo com mesmo nome já existe na empresa.

### `PUT /motivosdescarte/:id`

Atualiza um motivo de descarte existente. Requer perfil de `admin`.

*   **Requisição:**
    *   Método: `PUT`
    *   Endpoint: `/api/motivosdescarte/60d5f0e072b4e2001f3e8c84`
    *   Headers: `Authorization: Bearer <token_admin>`
    *   Corpo (JSON - apenas campos a alterar):
        ```json
        {
          "nome": "Valor Acima do Orçamento",
          "ativo": false
        }
        ```
*   **Resposta de Sucesso (200 OK):** (Retorna o motivo atualizado)
*   **Resposta de Erro (400 Bad Request):** ID inválido, nome inválido.
*   **Resposta de Erro (404 Not Found):** Motivo não encontrado na empresa.
*   **Resposta de Erro (409 Conflict):** Novo nome já existe.

### `DELETE /motivosdescarte/:id`

Exclui um motivo de descarte. Requer perfil de `admin`.

*   **Restrição:** Não é possível excluir se o motivo estiver sendo usado por algum lead.
*   **Requisição:**
    *   Método: `DELETE`
    *   Endpoint: `/api/motivosdescarte/60d5f0e072b4e2001f3e8c84`
    *   Headers: `Authorization: Bearer <token_admin>`
*   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "message": "Motivo \"Nome do Motivo\" excluído com sucesso."
    }
    ```
*   **Resposta de Erro (400 Bad Request):** ID inválido.
*   **Resposta de Erro (404 Not Found):** Motivo não encontrado.
*   **Resposta de Erro (409 Conflict):** Motivo em uso.

---
*(Mais seções da API serão adicionadas abaixo: Empreendimentos, Propostas, etc.)*
