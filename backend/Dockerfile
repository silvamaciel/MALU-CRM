# 1. Escolha uma imagem base do Node.js (use a versão LTS ou a que você está usando)
FROM node:20-slim

# (Opcional, mas recomendado) Instala dependências necessárias para o Puppeteer/Chrome
# Esta lista é uma boa base, pode precisar de ajustes mínimos dependendo da imagem base do Node.
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    # Fontes comuns para renderização de PDF
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    libxss1 \
    # Dependências do Chrome/Chromium
    libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 ca-certificates \
    lsb-release xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instala o Google Chrome estável
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    # Limpa o cache do apt para reduzir o tamanho da imagem
    && apt-get clean

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos package.json e package-lock.json (ou yarn.lock)
COPY package*.json ./

# Instala as dependências da sua aplicação backend
# Certifique-se que puppeteer-core está no seu package.json, e não puppeteer
RUN npm install --omit=dev
# Se você tinha um script postinstall do puppeteer que baixava o Chrome, ele não é mais necessário
# e pode ser removido do seu package.json se estava causando problemas.

# Copia todo o restante do código do seu backend para o diretório de trabalho no container
COPY . .

# (Opcional) Define um usuário não-root para rodar a aplicação (mais seguro)
# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser \
#     && chown -R pptruser:pptruser /usr/src/app
# USER pptruser

# Expõe a porta que sua aplicação Node.js usa (ex: 5000)
EXPOSE 5000

# Define o comando para iniciar sua aplicação quando o container rodar
CMD [ "node", "server.js" ]