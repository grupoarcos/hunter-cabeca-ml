FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

# Cria pasta de dados
RUN mkdir -p /app/data

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia código
COPY . .

# Variáveis de ambiente (defaults)
ENV PRODUTO="kit bolsa maternidade"
ENV MAX_LOJAS=500
ENV MIN_VENDAS=500
ENV APENAS_VERDE=true
ENV STOP_PAGES=8

# Proxy Webshare (configurar no deploy)
ENV PROXY_HOST=""
ENV PROXY_PORT=""
ENV PROXY_USER=""
ENV PROXY_PASS=""

CMD ["npm", "start"]