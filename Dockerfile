FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia código
COPY . .

CMD ["npm", "start"]