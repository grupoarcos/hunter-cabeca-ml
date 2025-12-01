export interface Config {
  // Busca
  produto: string;
  categoria: string;
  maxLojas: number;
  minVendasLoja: number;
  apenasReputacaoVerde: boolean;
  stopIfNoNewStores: number;

  // Proxy
  proxy: {
    host: string;
    port: string;
    user: string;
    pass: string;
  };

  // Crawler
  maxConcurrency: number;
  requestTimeout: number;

  // Delay (em segundos)
  delayMin: number;
  delayMax: number;

  // MongoDB
  mongo: {
    uri: string;
    database: string;
    collection: string;
  };
}

export function loadConfig(): Config {
  return {
    // Busca
    produto: process.env.PRODUTO || "kit bolsa maternidade",
    categoria: process.env.CATEGORIA || "geral",
    maxLojas: parseInt(process.env.MAX_LOJAS || "500"),
    minVendasLoja: parseInt(process.env.MIN_VENDAS || "500"),
    apenasReputacaoVerde: process.env.APENAS_VERDE !== "false",
    stopIfNoNewStores: parseInt(process.env.STOP_PAGES || "8"),

    // Proxy
    proxy: {
      host: process.env.PROXY_HOST || "p.webshare.io",
      port: process.env.PROXY_PORT || "80",
      user: process.env.PROXY_USER || "fpzsrqhf-BR-AR-CL-CO-rotate",
      pass: process.env.PROXY_PASS || "1zlklyvcdrlm",
    },

    // Crawler
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "2"),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "90"),

    // Delay (segundos)
    delayMin: parseInt(process.env.DELAY_MIN || "5"),
    delayMax: parseInt(process.env.DELAY_MAX || "30"),

    // MongoDB
    mongo: {
      uri: process.env.MONGO_URI || "mongodb://localhost:27017",
      database: process.env.MONGO_DB || "ml_scraper",
      collection: process.env.MONGO_COLLECTION || "lojas",
    },
  };
}

export function logConfig(config: Config): void {
  console.log("🔥 ML SCRAPER v3.0 - STANDALONE TS");
  console.log("─".repeat(40));
  console.log(`📦 Produto: ${config.produto}`);
  console.log(`📁 Categoria: ${config.categoria}`);
  console.log(`🎯 Meta: ${config.maxLojas} lojas`);
  console.log(`📊 Min vendas: ${config.minVendasLoja}`);
  console.log(`💚 Apenas verde: ${config.apenasReputacaoVerde}`);
  console.log(`🛑 Stop após: ${config.stopIfNoNewStores} páginas vazias`);
  console.log(`⏳ Delay: ${config.delayMin}s - ${config.delayMax}s`);
  console.log(
    `🌐 Proxy: ${config.proxy.host ? "Configurado" : "Não configurado"}`
  );
  console.log(
    `🗄️  MongoDB: ${config.mongo.uri ? "Configurado" : "Não configurado"}`
  );
  console.log("─".repeat(40));
}
