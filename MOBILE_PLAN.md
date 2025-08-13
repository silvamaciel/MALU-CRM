# Plano de Adoção Mobile - CRM

## 1. Sumário Executivo

Este documento detalha a estratégia e o roadmap para a criação de uma versão mobile (React Native/Expo) para a plataforma de CRM existente, reutilizando o backend Node.js atual. A análise do código-fonte revelou uma base de backend robusta e bem estruturada, com APIs RESTful e um bom uso de padrões de serviço.

No entanto, foram identificadas lacunas críticas, principalmente no sistema de autenticação, que precisam ser resolvidas para garantir uma experiência mobile segura e fluida. O plano de ação proposto visa endereçar essas lacunas de forma incremental ao longo de 4 sprints, culminando na entrega de uma aplicação Android pronta para produção.

## 2. Leitura e Mapa do Código Backend

### 2.1. Diagrama de Módulos

O backend segue uma arquitetura de serviços modular, o que facilita a manutenção e a reutilização de código.

```
/
|-- config/
|   |-- db.js            # Conexão com MongoDB
|-- models/
|   |-- User.js          # Modelo de Usuário (Mongoose)
|   |-- Lead.js          # Modelo de Lead
|   |-- Company.js       # ... e outros modelos de dados
|-- routes/
|   |-- authRoutes.js    # Rotas de autenticação (/api/auth)
|   |-- leadRoutes.js    # Rotas de leads (/api/leads)
|   |-- ...              # Demais rotas de recursos
|-- controllers/
|   |-- authController.js# Lógica de HTTP (req, res) para autenticação
|   |-- LeadController.js# Lógica de HTTP para leads
|   |-- ...              # Demais controllers
|-- services/
|   |-- authService.js   # Lógica de negócio de autenticação
|   |-- LeadService.js   # Lógica de negócio de leads
|   |-- ...              # Demais serviços com a lógica principal
|-- middlewares/
|   |-- authMiddleware.js# Proteção de rotas (validação de JWT)
|-- server.js            # Ponto de entrada da aplicação Express
```

### 2.2. Lista de Endpoints REST (Principais)

| Método | Rota                      | Auth? | Mídia         | Definição                      |
| :----- | :------------------------ | :---- | :------------ | :----------------------------- |
| POST   | `/api/auth/login`         | Não   | JSON          | `routes/authRoutes.js`         |
| POST   | `/api/auth/google/callback`| Não   | JSON          | `routes/authRoutes.js`         |
| GET    | `/api/leads`              | Sim   | Query Params  | `routes/leadRoutes.js`         |
| POST   | `/api/leads`              | Sim   | JSON          | `routes/leadRoutes.js`         |
| GET    | `/api/leads/:id`          | Sim   | -             | `routes/leadRoutes.js`         |
| PUT    | `/api/leads/:id`          | Sim   | JSON          | `routes/leadRoutes.js`         |
| POST   | `/api/leads/importar-csv` | Sim   | multipart/form| `routes/leadRoutes.js`         |
| GET    | `/api/users/me`           | Sim   | -             | `routes/userRoutes.js`         |
| GET    | `/api/chat`               | Sim   | -             | `routes/chatRoutes.js`         |

### 2.3. Middlewares Críticos e Integrações

-   **Autenticação:** `middlewares/authMiddleware.js` (`protect`, `authorize`) valida o JWT Bearer em todas as rotas protegidas.
-   **CORS:** Configurado em `server.js`, atualmente restrito ao `FRONTEND_URL`. **Precisará de ajuste para o mobile**.
-   **Uploads:** `multer` é usado em `routes/leadRoutes.js` para upload de CSV, com armazenamento em memória.
-   **Integrações Externas:**
    -   **Google:** `google-auth-library` para autenticação e `google-calendar-service` para integração com a agenda.
    -   **Meta/Facebook:** Webhooks são recebidos via `webhookController.js` e `evolutionWebhookController.js`.

## 3. Análise de Prontidão para Mobile

| Categoria                | Status                                                                                                                              | Ação Recomendada                                                                                                                                                                                                                                  |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Paginação**            | ✅ **Pronto**. O endpoint `GET /api/leads` já suporta paginação (`page`, `limit`) e retorna metadados (`totalPages`, `totalLeads`).    | Nenhuma. Manter o padrão para novas rotas de listagem.                                                                                                                                                                                            |
| **Erros Padronizados**   | ✅ **Bom**. A API retorna respostas de erro em JSON com uma chave `error`, facilitando o tratamento no cliente.                       | Manter a consistência. Considerar a criação de um middleware de erro centralizado para padronizar todos os erros.                                                                                                                              |
| **Versionamento de API** | ❌ **Ausente**. Não há versionamento (ex: `/api/v1`).                                                                                 | **Crítico**. Introduzir `/api/v1` em todas as rotas para evitar que as mudanças necessárias para o mobile (ex: auth) quebrem a aplicação web atual.                                                                                             |
| **Payloads de Resposta** | ⚠️ **Razoável**. O endpoint de lista (`getLeads`) usa `$project` para limitar os campos. O de detalhe (`getLeadById`) usa `populate`. | Monitorar o tamanho das respostas do `getLeadById`. Se necessário, criar um DTO (Data Transfer Object) específico para a resposta mobile, omitindo campos desnecessários. Evitar enviar imagens em Base64; usar URLs. |
| **Refresh Tokens**       | ❌ **Ausente**. A API só emite um access token de curta/média duração (1 dia).                                                        | **Crítico**. Implementar um sistema completo de refresh tokens: endpoint `/auth/refresh`, armazenamento seguro do refresh token no DB e retorno de ambos (`access_token`, `refresh_token`) no login.                           |
| **Upload de Arquivos**   | ⚠️ **Razoável**. `multer` em memória funciona para CSVs, mas não é ideal para arquivos de mídia grandes do mobile.                    | Para o mobile, implementar upload de imagens/documentos usando URLs pré-assinadas (presigned URLs) para um serviço de storage (S3, Google Cloud Storage), evitando que o arquivo passe pelo backend.               |

## 4. Plano de Entrega Mobile (Roadmap)

O desenvolvimento será dividido em 4 sprints, com entregáveis claros.

### Sprint 1: Fundações - Autenticação e Infraestrutura Mobile

-   **Objetivo:** Implementar um sistema de autenticação robusto no backend e configurar a base do aplicativo mobile.
-   **Issues:**
    -   `[Backend] #1: Introduzir versionamento /api/v1 nas rotas`
    -   `[Backend] #2: Implementar sistema de Refresh Token com endpoint /api/v1/auth/refresh`
    -   `[Backend] #3: Adaptar endpoint de login para retornar access e refresh tokens`
    -   `[Mobile] #4: Criar projeto Expo (TypeScript) e estrutura de pastas`
    -   `[Mobile] #5: Implementar cliente Axios com interceptors para refresh token`
    -   `[Mobile] #6: Configurar armazenamento seguro de tokens com expo-secure-store`
    -   `[Mobile] #7: Desenvolver telas de Login e fluxo de autenticação inicial`

### Sprint 2: Funcionalidade Principal - Leads e Push Notifications

-   **Objetivo:** Implementar o fluxo completo de CRUD de Leads e configurar o recebimento de notificações push.
-   **Issues:**
    -   `[Backend] #8: Criar endpoint POST /api/v1/users/me/push-token`
    -   `[Mobile] #9: Desenvolver tela de lista de Leads (paginada e com filtros)`
    -   `[Mobile] #10: Desenvolver tela de detalhes do Lead`
    -   `[Mobile] #11: Desenvolver formulário de criação/edição de Lead`
    -   `[Mobile] #12: Implementar upload de imagens para Leads com expo-image-picker`
    -   `[Mobile] #13: Integrar expo-notifications para registrar token de push`

### Sprint 3: Funcionalidades Avançadas - Chat e Offline-First

-   **Objetivo:** Desenvolver o chat em tempo real e adicionar capacidades de cache e funcionamento offline.
-   **Issues:**
    -   `[Backend] #14: Revisar e garantir segurança da autenticação do Socket.IO`
    -   `[Mobile] #15: Implementar cliente Socket.IO e telas de Chat`
    -   `[Mobile] #16: Implementar estratégia de cache com React Query ou similar`
    -   `[Mobile] #17: Desenvolver "caixa de saída" para sincronização de ações offline`

### Sprint 4: Polimento, Testes e Publicação

-   **Objetivo:** Garantir a qualidade, coletar métricas e preparar o aplicativo para a loja Android.
-   **Issues:**
    -   `[QA] #18: Escrever testes de integração para os novos endpoints de backend`
    -   `[QA] #19: Implementar testes E2E para fluxos críticos no mobile (Login, Criar Lead)`
    -   `[Mobile] #20: Integrar Sentry para monitoramento de erros e performance`
    -   `[Mobile] #21: Gerar build de produção para Android (.aab) e testar em dispositivo físico`

## 5. Qualidade e Riscos

### 5.1. Testes Automatizados Prioritários

1.  **Backend (Integração):**
    -   Testar o fluxo completo de `login` -> `refresh` -> `acesso a rota protegida` -> `logout`.
    -   Testar a validação e paginação do endpoint `GET /api/v1/leads`.
    -   Testar a criação de um lead com todos os campos válidos.
2.  **Mobile (Unitário/Componente):**
    -   Testar a lógica do interceptor do Axios.
    -   Testar a validação do formulário de criação de lead.
3.  **Mobile (E2E):**
    -   Fluxo de login com credenciais válidas e inválidas.
    -   Fluxo de criação de um novo lead e verificação na lista.

### 5.2. Matriz de Riscos

| Risco                                  | Probabilidade | Impacto | Mitigação                                                                                                                                                           |
| :------------------------------------- | :------------ | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vazamento de Refresh Token**         | Baixa         | Alta    | Usar `expo-secure-store` no mobile. No backend, implementar detecção de reuso de refresh token (invalida toda a família de tokens) e expiração curta para o mesmo. |
| **Performance Ruim em Listas**         | Média         | Média   | Garantir que a `FlatList` no React Native esteja otimizada (usar `keyExtractor`, `getItemLayout`). Monitorar o tempo de resposta da API de lista.                  |
| **Gestão de Estado Complexa**          | Média         | Média   | Adotar uma biblioteca de gestão de estado/cache de servidor como `React Query` desde o início para simplificar a lógica de fetching, cache e mutações.             |
| **Limites de API (Google/Meta)**       | Baixa         | Alta    | Implementar `rate limiting` e filas no backend para chamadas a APIs externas. Usar `webhooks` sempre que possível para receber atualizações em vez de polling.    |
| **Inconsistência de Dados Offline**    | Média         | Média   | Desenvolver uma estratégia de resolução de conflitos clara. Logar todas as falhas de sincronização para depuração.                                                  |
