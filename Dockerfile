FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app
RUN mkdir -p /app/data
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
# Instala dependências
COPY package*.json ./
RUN npm install

# Copia código
COPY . .

CMD ["npm", "start"]    