# Guia de Início Rápido (Getting Started)

Este guia descreve os passos necessários para configurar e rodar o sistema CRM Imobiliário localmente em seu ambiente de desenvolvimento.

## Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes softwares instalados:

*   **Node.js:** Versão 20.x.x ou superior (conforme especificado em `backend/package.json`). Você pode usar um gerenciador de versões como [nvm](https://github.com/nvm-sh/nvm) para facilitar a instalação e troca entre versões do Node.js.
*   **npm:** Geralmente vem instalado com o Node.js. Usado para gerenciamento de dependências.
*   **Git:** Para clonar o repositório.
*   **MongoDB:** Uma instância do MongoDB rodando localmente ou acessível remotamente. Você pode instalar o [MongoDB Community Server](https://www.mongodb.com/try/download/community) ou usar um serviço de banco de dados MongoDB na nuvem (como MongoDB Atlas) para desenvolvimento.

## 1. Clonagem do Repositório

Primeiro, clone o repositório do projeto para a sua máquina local:

```bash
git clone <URL_DO_REPOSITORIO_GIT>
cd <NOME_DA_PASTA_DO_PROJETO>
```

Substitua `<URL_DO_REPOSITORIO_GIT>` pela URL correta do repositório e `<NOME_DA_PASTA_DO_PROJETO>` pelo nome da pasta que será criada.

## 2. Configuração do Backend

O backend é uma aplicação Node.js/Express.

### 2.1. Instalação de Dependências

Navegue até a pasta `backend` e instale as dependências:

```bash
cd backend
npm install
```

### 2.2. Configuração de Variáveis de Ambiente

O backend requer variáveis de ambiente para funcionar corretamente, especialmente para conexão com o banco de dados e segredos de autenticação.

1.  Crie um arquivo chamado `.env` na raiz da pasta `backend`.
2.  Copie o conteúdo de um arquivo de exemplo (se existir, como `.env.example`) ou adicione as seguintes variáveis essenciais ao seu arquivo `.env`. Adapte os valores conforme sua configuração local:

    ```ini
    # Configurações do Servidor
    NODE_ENV=development
    PORT=5000

    # MongoDB
    MONGO_URI=mongodb://localhost:27017/crm_imobiliario_dev  # Ou sua string de conexão do MongoDB Atlas

    # Autenticação JWT
    JWT_SECRET=osegredomaissecretodomundochangeitnow # Use uma string longa, aleatória e segura

    # Integração Google OAuth (Opcional para rodar localmente, mas necessário para a funcionalidade)
    # Estes são obtidos no Google Cloud Console ao configurar o OAuth 2.0
    GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID_AQUI
    GOOGLE_CLIENT_SECRET=SEU_GOOGLE_CLIENT_SECRET_AQUI
    GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback # Verifique a rota correta no backend

    # Integração Facebook (Opcional para rodar localmente)
    # Estes são obtidos no Facebook for Developers
    REACT_APP_FACEBOOK_APP_ID=SEU_FACEBOOK_APP_ID_AQUI # Usado no server.js, nome pode ser confuso
    FB_APP_SECRET=SEU_FACEBOOK_APP_SECRET_AQUI
    FB_VERIFY_TOKEN=SEU_TOKEN_DE_VERIFICACAO_DO_WEBHOOK_FB # Para configurar webhooks
    FB_WEBHOOK_RECEIVER_URL=http://localhost:5000/api/webhooks/facebook # URL que o FB chamará

    # Outras configurações podem ser necessárias dependendo das features ativas
    ```

    **Importante:**
    *   Substitua os valores de exemplo pelos seus próprios.
    *   Para `JWT_SECRET`, use uma chave forte e única.
    *   As credenciais do Google e Facebook são obtidas ao configurar os respectivos aplicativos de desenvolvedor. Para rodar o core da aplicação localmente sem essas integrações, você pode deixar os valores em branco ou como placeholders, mas as funcionalidades de login social não funcionarão.

### 2.3. Rodando o Backend

Após instalar as dependências e configurar o `.env`, você pode iniciar o servidor backend no modo de desenvolvimento (com auto-reload usando `nodemon`):

```bash
npm run dev
```

Ou para rodar em modo de produção (menos comum para desenvolvimento local):

```bash
npm start
```

Você deverá ver uma mensagem no console indicando que o servidor está rodando (ex: `Servidor rodando na porta 5000`) e mensagens de log, incluindo a verificação das variáveis de ambiente.

## 3. Configuração do Frontend

O frontend é uma aplicação React.

### 3.1. Instalação de Dependências

Abra um novo terminal (ou navegue para fora da pasta `backend`), vá para a pasta `frontend` e instale as dependências:

```bash
cd ../frontend  # Se você estava na pasta backend
# ou 'cd frontend' se você estava na raiz do projeto
npm install
```

### 3.2. Configuração de Variáveis de Ambiente

O frontend também pode requerer variáveis de ambiente, especialmente para chaves de API de serviços que são usados no lado do cliente.

1.  Crie um arquivo chamado `.env` na raiz da pasta `frontend`.
2.  Adicione as seguintes variáveis. Adapte os valores conforme necessário:

    ```ini
    # URL da API Backend
    # Esta é a URL que o frontend usará para fazer chamadas à API do backend.
    REACT_APP_API_URL=http://localhost:5000/api

    # Google Client ID para o @react-oauth/google (usado no frontend)
    # Este é obtido no Google Cloud Console
    REACT_APP_GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID_PARA_FRONTEND_AQUI

    # Facebook App ID para o @greatsumini/react-facebook-login (usado no frontend)
    # Este é obtido no Facebook for Developers
    REACT_APP_FACEBOOK_APP_ID=SEU_FACEBOOK_APP_ID_PARA_FRONTEND_AQUI

    # Outras variáveis de ambiente específicas do frontend podem ser adicionadas aqui
    # Ex: VITE_ALGUMA_COISA (se usar Vite) ou REACT_APP_OUTRA_COISA (para Create React App)
    ```

    **Importante:**
    *   `REACT_APP_API_URL` deve apontar para o endereço onde seu backend está rodando.
    *   `REACT_APP_GOOGLE_CLIENT_ID` e `REACT_APP_FACEBOOK_APP_ID` são os IDs das aplicações configuradas para uso no frontend (podem ser os mesmos do backend ou diferentes, dependendo da configuração do OAuth/Login social).
    *   Para Create React App, as variáveis de ambiente devem começar com `REACT_APP_`.

### 3.3. Rodando o Frontend

Após instalar as dependências e configurar o `.env`, você pode iniciar o servidor de desenvolvimento do React:

```bash
npm start
```

Isso geralmente abrirá a aplicação automaticamente no seu navegador padrão, em um endereço como `http://localhost:3000`. Se não abrir, verifique o output do console para o endereço correto.

## 4. Estrutura Básica de Ambiente (Resumo `.env.example`)

Para referência, aqui está um resumo das variáveis que você provavelmente precisará definir. Considere criar arquivos `.env.example` em `backend` e `frontend` no seu projeto para guiar outros desenvolvedores.

### `backend/.env.example`

```ini
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/crm_imobiliario_dev
JWT_SECRET=your_strong_jwt_secret_key

# Opcional, mas recomendado para funcionalidades completas
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Opcional, mas recomendado para funcionalidades completas
REACT_APP_FACEBOOK_APP_ID= # Sim, este nome é usado no backend server.js
FB_APP_SECRET=
FB_VERIFY_TOKEN=
FB_WEBHOOK_RECEIVER_URL=http://localhost:5000/api/webhooks/facebook
```

### `frontend/.env.example`

```ini
REACT_APP_API_URL=http://localhost:5000/api

# Opcional, mas recomendado para funcionalidades completas
REACT_APP_GOOGLE_CLIENT_ID=
REACT_APP_FACEBOOK_APP_ID=
```

## Próximos Passos

Com o backend e o frontend rodando, você deve ser capaz de acessar a aplicação no seu navegador (geralmente `http://localhost:3000`), registrar um novo usuário (se aplicável) ou usar credenciais de teste, e começar a explorar as funcionalidades do CRM Imobiliário.

Verifique os logs do console em ambos os terminais (backend e frontend) para qualquer erro ou mensagem de diagnóstico.
