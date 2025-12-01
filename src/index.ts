import "dotenv/config";
import { loadConfig, logConfig } from "./config/index.js";
import { createCrawler, buildInitialUrl } from "./crawler/index.js";
import { createStorageState, logStorageStats } from "./storage/index.js";
import { createFilterStats, logFilterStats } from "./filters/index.js";
import {
  connectDatabase,
  disconnectDatabase,
  getStats,
} from "./database/index.js";

async function main(): Promise<void> {
  // Carrega configuração
  const config = loadConfig();
  logConfig(config);

  // Conecta ao MongoDB
  await connectDatabase(config);

  // Inicializa estado
  const state = createStorageState();
  const filterStats = createFilterStats();

  try {
    // Cria crawler
    const crawler = await createCrawler(config, state, filterStats);

    // URL inicial
    const initialUrl = buildInitialUrl(config.produto);
    console.log(`📄 Iniciando busca: ${initialUrl}\n`);

    // Executa
    await crawler.run([
      {
        url: initialUrl,
        userData: { label: "BUSCA_INICIAL" },
      },
    ]);

    // Relatório final
    logStorageStats(state);
    logFilterStats(filterStats);

    // Stats do MongoDB
    const stats = await getStats();
    console.log(`\n📊 Estatísticas do banco:`);
    console.log(`   Total de lojas: ${stats.total}`);
    console.log(`   MercadoLíderes: ${stats.mercadoLideres}`);
    console.log(`   Por categoria:`, stats.porCategoria);
    console.log("====================================================\n");
  } catch (error) {
    console.error("❌ Erro durante execução:", error);
  } finally {
    // Desconecta do MongoDB (sempre)
    await disconnectDatabase();
  }
}

// Executa
main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
