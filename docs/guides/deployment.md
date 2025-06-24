# Guia de Deploy (Deployment)

Este guia descreve como o deploy do sistema CRM Imobiliário é tipicamente realizado, com o frontend hospedado na Vercel e o backend na Railway. Ele também cobre aspectos de CI/CD, gerenciamento de secrets e variáveis de ambiente.

## 1. Visão Geral do Deploy

A aplicação é dividida em duas partes principais que são deployadas separadamente:

*   **Frontend (React SPA):** Hospedado na [Vercel](https://vercel.com/). A Vercel é otimizada para aplicações frontend estáticas e Jamstack, oferecendo builds rápidos, CDN global e integração com Git.
*   **Backend (Node.js API):** Hospedado na [Railway](https://railway.app/). A Railway é uma plataforma PaaS que simplifica o deploy de aplicações backend e bancos de dados.

Este modelo de deploy separado permite escalar e gerenciar cada parte da aplicação de forma independente.

## 2. Deploy do Backend na Railway

### 2.1. Preparação

*   **Dockerfile (Opcional, mas recomendado):** Embora a Railway possa detectar e buildar aplicações Node.js automaticamente, ter um `Dockerfile` na raiz da pasta `backend` (como o `backend/Dockerfile` existente) oferece maior controle sobre o ambiente de execução.
    ```dockerfile
    # Exemplo de backend/Dockerfile (verifique o existente no projeto)
    FROM node:20-alpine # Use a versão do Node especificada no package.json
    WORKDIR /usr/src/app
    COPY package*.json ./
    RUN npm install --only=production # Instalar apenas dependências de produção
    COPY . .
    EXPOSE 5000 # Ou a porta que seu app usa (process.env.PORT)
    CMD [ "node", "server.js" ]
    ```
*   **Scripts no `package.json`:** Certifique-se de que o script `start` em `backend/package.json` está configurado para iniciar a aplicação em modo de produção (ex: `node server.js`).
*   **Dependências:** Novas dependências como `dompurify`, `jsdom`, `express-validator`, e `papaparse` serão instaladas automaticamente via `npm install` durante o build na Railway. Dependências de desenvolvimento como `mongodb-memory-server`, `jest`, `supertest` não são instaladas em produção se `npm install --only=production` (ou similar) for usado, o que é comum.
*   **Repositório Git:** Seu código deve estar em um repositório Git (GitHub, GitLab, Bitbucket) que a Railway possa acessar.

### 2.2. Configuração na Railway

1.  **Crie um Projeto na Railway:** Faça login na Railway e crie um novo projeto.
2.  **Adicione um Serviço:** Dentro do projeto, adicione um novo serviço. Você pode conectar seu repositório Git diretamente.
    *   Selecione o repositório e o branch que deseja deployar.
    *   A Railway tentará detectar automaticamente a stack (Node.js). Se você tiver um `Dockerfile`, ela pode usá-lo.
    *   Especifique a pasta raiz do backend (ex: `./backend` se o repositório for monorepo).
3.  **Variáveis de Ambiente (Secrets):**
    *   Na Railway, vá para as configurações do seu serviço backend e adicione todas as variáveis de ambiente necessárias (semelhantes ao seu arquivo `.env` local, mas para o ambiente de produção/staging).
    *   **Exemplos Críticos:**
        *   `NODE_ENV=production`
        *   `PORT` (A Railway geralmente define isso automaticamente, mas verifique)
        *   `MONGO_URI` (String de conexão para seu banco de dados MongoDB de produção/staging, que também pode ser hospedado na Railway ou externamente como MongoDB Atlas)
        *   `JWT_SECRET` (Use um segredo forte e único para produção)
        *   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (configurados com as URLs de produção/staging)
        *   `REACT_APP_FACEBOOK_APP_ID`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `FB_WEBHOOK_RECEIVER_URL` (configurados com as URLs de produção/staging)
    *   **NÃO** comite arquivos `.env` com segredos no Git. Use o sistema de variáveis de ambiente da Railway.
4.  **Comando de Build e Start:**
    *   **Comando de Build (se necessário):** A Railway pode inferir isso do `package.json` ou `Dockerfile`. Ex: `npm install --only=production`.
    *   **Comando de Start:** Geralmente `npm start` ou o `CMD` do seu `Dockerfile`.
5.  **Porta:** A Railway expõe sua aplicação em uma porta específica. Seu backend deve escutar na porta fornecida pela variável de ambiente `PORT` (ex: `const PORT = process.env.PORT || 5000;`).
6.  **Deploy:** A Railway iniciará o build e o deploy. Você receberá um domínio público (ex: `backend-meuprojeto.up.railway.app`) para acessar sua API.

## 3. Deploy do Frontend na Vercel

### 3.1. Preparação

*   **Scripts no `package.json`:** Certifique-se de que o script `build` em `frontend/package.json` (ex: `react-scripts build`) gera os arquivos estáticos da sua aplicação React na pasta `build` (ou `dist`).
*   **Dependências:** Novas dependências como `dompurify` serão instaladas automaticamente via `npm install` durante o build na Vercel.
*   **Repositório Git:** Seu código deve estar em um repositório Git que a Vercel possa acessar.

### 3.2. Configuração na Vercel

1.  **Crie um Projeto na Vercel:** Faça login na Vercel e importe seu projeto Git.
2.  **Configure o Projeto:**
    *   Selecione o repositório e o branch principal.
    *   **Framework Preset:** Vercel geralmente detecta "Create React App" automaticamente.
    *   **Build Command:** Deve ser `npm run build` ou `yarn build`. (Ex: `cd frontend && npm run build` se for monorepo).
    *   **Output Directory:** Geralmente `build` para Create React App. (Ex: `frontend/build`).
    *   **Install Command:** `npm install` ou `yarn install`. (Ex: `cd frontend && npm install`).
    *   **Root Directory:** Se o frontend estiver em uma subpasta (ex: `frontend`), especifique aqui.
3.  **Variáveis de Ambiente:**
    *   Nas configurações do projeto na Vercel, adicione as variáveis de ambiente necessárias para o build do frontend.
    *   **Exemplos Críticos:**
        *   `REACT_APP_API_URL`: A URL completa da sua API backend deployada na Railway (ex: `https://backend-meuprojeto.up.railway.app/api`).
        *   `REACT_APP_GOOGLE_CLIENT_ID`: O Client ID do Google OAuth configurado para o domínio de produção/staging do frontend.
        *   `REACT_APP_FACEBOOK_APP_ID`: O App ID do Facebook configurado para o domínio de produção/staging do frontend.
        *   `CI=false` (às vezes necessário para evitar que warnings sejam tratados como erros no build do CRA na Vercel).
4.  **Deploy:** A Vercel fará o build e o deploy. Você receberá um domínio público (ex: `meuprojeto.vercel.app`).

## 4. Deploy Automático (CI/CD)

Tanto a Vercel quanto a Railway oferecem integração com Git para Continuous Deployment (CD):

*   **Vercel:** Automaticamente deploya cada push para o branch de produção (ex: `main` ou `master`) e também cria "Preview Deployments" para cada push em outros branches ou pull requests. Isso é extremamente útil para testar mudanças antes de mesclar.
*   **Railway:** Pode ser configurada para observar um branch específico do seu repositório. Qualquer push para esse branch disparará um novo build e deploy do serviço backend.

**Para configurar CI/CD:**

1.  **Conecte seu Repositório:** Certifique-se de que seus projetos na Vercel e Railway estão conectados ao seu repositório Git (GitHub, GitLab, etc.).
2.  **Defina o Branch de Produção:** Configure qual branch (ex: `main`) deve acionar deploys para o ambiente de produção.
3.  **Webhooks (Automático):** Geralmente, Vercel e Railway configuram webhooks no seu repositório Git automaticamente para serem notificados de novos pushes.

## 5. Gerenciamento de Secrets

**NUNCA** comite segredos (chaves de API, senhas de banco de dados, `JWT_SECRET`) diretamente no seu código ou em arquivos `.env` versionados.

*   **Vercel:** Use a seção "Environment Variables" nas configurações do projeto. Você pode definir variáveis para diferentes ambientes (Production, Preview, Development).
*   **Railway:** Use a seção "Variables" nas configurações do serviço. Estas são injetadas como variáveis de ambiente no seu container.

**Boas Práticas:**

*   Use nomes de variáveis consistentes entre seus arquivos `.env` locais e as configurações nas plataformas de deploy.
*   Para `JWT_SECRET` em produção, gere uma string longa, complexa e aleatória.
*   Rotacione segredos periodicamente, se aplicável.

## 6. Ambientes de Staging e Produção

É uma boa prática ter ambientes separados para desenvolvimento, staging (testes) e produção.

*   **Staging:**
    *   **Backend (Railway):** Você pode criar um novo serviço na Railway (ou usar um branch de deploy) que aponte para um banco de dados de staging e use variáveis de ambiente de staging.
    *   **Frontend (Vercel):** Deploys de branches que não são o de produção (ex: `develop`, `staging`, ou branches de feature) na Vercel podem servir como seu ambiente de staging. Configure as variáveis de ambiente do frontend para apontar para a API de staging.
*   **Produção:**
    *   **Backend (Railway):** Seu serviço principal na Railway, conectado ao banco de dados de produção e usando variáveis de ambiente de produção.
    *   **Frontend (Vercel):** O deploy do seu branch de produção (ex: `main`) na Vercel.

**Configuração de Domínio:**

*   Após o deploy, você provavelmente desejará configurar domínios customizados para seus ambientes de produção (ex: `app.suaempresa.com` para o frontend, `api.suaempresa.com` para o backend). Ambas as plataformas oferecem guias sobre como fazer isso.

Lembre-se de configurar corretamente as URLs de callback do OAuth (Google, Facebook) e a URL da API (`REACT_APP_API_URL`) para cada ambiente respectivo. A configuração de CORS no backend (`Access-Control-Allow-Origin`) também deve incluir os domínios dos seus frontends de staging e produção.
