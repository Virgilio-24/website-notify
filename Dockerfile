FROM node:20-slim

# Dependências necessárias para o Chromium correr em Docker
RUN apt-get update && apt-get install -y \
  chromium \
  libglib2.0-0 \
  libnss3 \
  libfontconfig1 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libcairo2 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libasound2 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

EXPOSE 3010

CMD ["node", "src/index.js"]
