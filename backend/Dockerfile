# 1. Imagem base do Node.js
FROM node:20-slim

# 2. Define o diretório de trabalho
WORKDIR /usr/src/app

# 3. Define ARG para evitar prompts interativos durante builds
ARG DEBIAN_FRONTEND=noninteractive

# 4. Instala dependências do sistema e o wkhtmltopdf
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    lsb-release \
    xdg-utils \
    wkhtmltopdf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 5. Instala o Google Chrome estável
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 6. Copia package.json e package-lock.json
COPY package*.json ./

# 7. Instala dependências da aplicação
RUN npm install --omit=dev 

# 8. Copia o restante do código
COPY . .

# 9. Define usuário não-root (opcional)
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /usr/src/app
USER appuser

# 10. Expõe a porta da aplicação
EXPOSE 5000

# 11. Comando para iniciar
CMD [ "node", "server.js" ]
