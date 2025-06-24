# Visão Geral do Sistema CRM Imobiliário

Este documento descreve a arquitetura de alto nível do sistema CRM Imobiliário, detalhando seus principais componentes, o fluxo de comunicação e as tecnologias empregadas.

## 1. Visão Geral da Arquitetura

O sistema é construído sobre uma arquitetura de três camadas clássica, compreendendo:

*   **Frontend (Cliente):** Uma Single Page Application (SPA) desenvolvida em React, responsável pela interface do usuário (UI) e experiência do usuário (UX). Interage com o backend através de chamadas API REST.
*   **Backend (Servidor):** Uma API RESTful desenvolvida em Node.js com o framework Express.js. É responsável pela lógica de negócios, processamento de dados, autenticação, e comunicação com o banco de dados.
*   **Banco de Dados:** Um banco de dados NoSQL MongoDB, utilizado para persistir todos os dados da aplicação, como informações de leads, propostas, usuários, empreendimentos, etc.

```mermaid
graph TD
    A[Usuário (Browser)] -- HTTPS --> B(Frontend - React SPA);
    B -- API Calls (REST/JSON) --> C{Backend - Node.js/Express API};
    C -- Consultas/Comandos --> D[(Banco de Dados - MongoDB)];
    C -- Webhooks/API Calls --> E{Serviços Externos};

    subgraph "Interface do Usuário"
        B
    end

    subgraph "Lógica de Negócios e Dados"
        C
        D
    end

    subgraph "Integrações"
        E
    end
```

## 2. Comunicação entre Frontend, Backend e Banco

*   **Frontend para Backend:**
    *   O frontend se comunica com o backend exclusivamente através de uma API RESTful.
    *   As requisições são feitas utilizando HTTP/S, com payloads geralmente no formato JSON.
    *   O Axios é a biblioteca HTTP cliente utilizada no frontend para realizar essas chamadas.
    *   A autenticação é baseada em JSON Web Tokens (JWT). Após o login, o token é enviado no header `Authorization` (Bearer token) de cada requisição protegida.

*   **Backend para Banco de Dados:**
    *   O backend utiliza a biblioteca Mongoose (ODM - Object Data Modeling) para interagir com o banco de dados MongoDB.
    *   Mongoose permite a definição de schemas para os modelos de dados, validações e facilita as operações CRUD (Create, Read, Update, Delete).
    *   A conexão com o MongoDB é estabelecida no início da aplicação backend, utilizando uma URI de conexão fornecida por variável de ambiente.

## 3. Fluxo de Dados

1.  **Interação do Usuário:** O usuário interage com a interface do React no navegador.
2.  **Ação na UI:** Uma ação (ex: preencher um formulário, clicar em um botão) dispara uma função no componente React.
3.  **Chamada API:** O componente React, através de um serviço ou diretamente, utiliza o Axios para montar e enviar uma requisição HTTP (GET, POST, PUT, DELETE) para o endpoint apropriado no backend.
4.  **Processamento no Backend:**
    *   O Express.js no backend recebe a requisição e a direciona para o controller correspondente, passando por middlewares (ex: autenticação, parsing de corpo).
    *   O controller invoca o service apropriado para executar a lógica de negócios.
    *   O service interage com o modelo Mongoose para realizar operações no banco de dados MongoDB (buscar, salvar, atualizar, deletar dados).
5.  **Resposta do Backend:** Após processar a requisição, o backend envia uma resposta HTTP (com status code e, opcionalmente, um corpo JSON) de volta para o frontend.
6.  **Atualização da UI:** O frontend recebe a resposta.
    *   Em caso de sucesso, atualiza seu estado e, consequentemente, a UI para refletir as mudanças (ex: exibir novos dados, mostrar uma mensagem de sucesso).
    *   Em caso de erro, exibe uma mensagem apropriada para o usuário.

## 4. Tecnologias Utilizadas por Camada

*   **Frontend (Cliente):**
    *   **Core:** React (v18+)
    *   **Roteamento:** React Router DOM (v6+)
    *   **Gerenciamento de Estado:** Principalmente estado local de componentes React (`useState`, `useEffect`), com dados de usuário e token JWT armazenados em `localStorage`.
    *   **Chamadas API:** Axios
    *   **UI/Componentes:**
        *   Componentes React customizados
        *   React-Beautiful-DND (para Kanban/arrastar e soltar)
        *   React-Toastify (para notificações)
        *   React-Quill (editor de texto rico)
        *   React-Dropzone (para upload de arquivos)
        *   Chart.js, Recharts (para gráficos)
    *   **Build Tool:** Create React App (react-scripts)
    *   **Linguagem:** JavaScript (com JSX)

*   **Backend (Servidor):**
    *   **Core:** Node.js (v20+)
    *   **Framework:** Express.js (v4+)
    *   **Banco de Dados ODM:** Mongoose (v8+)
    *   **Autenticação:** JSON Web Tokens (JWT) com a biblioteca `jsonwebtoken`, `bcryptjs` para hashing de senhas.
    *   **Manipulação de Arquivos:** Multer (para uploads), `csv-parser`, `papaparse` (para processamento de CSV).
    *   **Comunicação Externa:** Axios (para chamar outras APIs, se necessário), `google-auth-library`.
    *   **Geração de Documentos (potencial):** Puppeteer-core (sugere geração de PDF a partir de HTML para propostas/contratos).
    *   **Linguagem:** JavaScript (CommonJS)

*   **Banco de Dados:**
    *   **Tipo:** NoSQL, Orientado a Documentos
    *   **Sistema:** MongoDB

*   **Ambiente de Desenvolvimento/Build:**
    *   **Backend:** Nodemon (para auto-reload durante o desenvolvimento)
    *   **Frontend:** Webpack (via react-scripts)
    *   **Gerenciador de Pacotes:** npm

## 5. Pontos de Integração Externa

O sistema possui integrações (ou capacidade de integração) com os seguintes serviços externos:

*   **Google:**
    *   **OAuth 2.0:** Para login de usuários ("Sign in with Google") tanto no frontend (`@react-oauth/google`) quanto no backend (`google-auth-library` para verificação de token).
    *   Potencialmente outras APIs do Google, se necessário, utilizando `axios` no backend.
*   **Facebook:**
    *   **Login:** Para login de usuários ("Login with Facebook") no frontend (`@greatsumini/react-facebook-login`).
    *   **Webhooks:** O backend possui uma rota `/api/webhooks` (especificamente `webhookRoutes.js`) que sugere a capacidade de receber eventos do Facebook (ex: novos leads de anúncios do Facebook Lead Ads). Variáveis de ambiente como `FB_VERIFY_TOKEN` e `FB_WEBHOOK_RECEIVER_URL` corroboram isso.
*   **Outras APIs (Potencial):**
    *   A presença do `axios` no backend permite a integração com qualquer outra API RESTful de terceiros, conforme necessário para funcionalidades futuras (ex: consulta de CEP, envio de SMS/Email transacional).

Esta visão geral fornece um entendimento fundamental da arquitetura do sistema. Documentos mais detalhados sobre componentes específicos, decisões de design e fluxos de dados podem ser encontrados em outras seções desta documentação.
