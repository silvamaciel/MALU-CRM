# 1. Imagem base do Node.js
FROM node:20-slim

# 2. Define o diretório de trabalho
WORKDIR /usr/src/app

# 3. (OPCIONAL, MAS RECOMENDADO) Define ARG para não perguntar interativamente durante builds
ARG DEBIAN_FRONTEND=noninteractive

# 4. Instala dependências do sistema para o Chrome e Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    # Fontes comuns
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    # Dependências do Chrome (lista pode variar um pouco, esta é abrangente)
    libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 \
    libxss1 \
    libnss3 \ 
    lsb-release \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 5. Adiciona o repositório do Google Chrome e instala o Chrome estável
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 6. Copia package.json e package-lock.json
COPY package*.json ./

# 7. Instala dependências da aplicação (garanta que puppeteer-core está no package.json)
RUN npm install --omit=dev 

# 8. Copia o resto do código da aplicação
COPY . .

# 9. Define um usuário não-root
 RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/src/app
USER pptruser

# 10. Expõe a porta
EXPOSE 5000

# 11. Comando para iniciar
CMD [ "node", "server.js" ]