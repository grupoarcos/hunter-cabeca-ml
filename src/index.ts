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
import { execSync } from "child_process";

async function main(): Promise<void> {
  // Carrega configuração
  const config = loadConfig();
  logConfig(config);

  console.log("\n🌍 Descobrindo IP público do servidor...");
  try {
    const ip = execSync("curl -s https://api.ipify.org", { timeout: 30000 });
    console.log(`📍 IP público: ${ip.toString().trim()}`);
    console.log("👆 Adiciona esse IP no Webshare se ainda não tiver!\n");
  } catch (error) {
    console.log(`❌ Não conseguiu pegar IP: ${error}\n`);
  }

  // Teste de proxy com curl
  if (config.proxy.host && config.proxy.user && config.proxy.pass) {
    console.log("🧪 Testando proxy com curl...");
    try {
      const proxyUrl = `http://${config.proxy.user}:${config.proxy.pass}@${config.proxy.host}:${config.proxy.port}`;
      const result = execSync(
        `curl -x "${proxyUrl}" -s https://api.ipify.org`,
        { timeout: 30000 }
      );
      console.log(
        `✅ Proxy funciona! IP via proxy: ${result.toString().trim()}\n`
      );
    } catch (error) {
      console.log(`❌ Proxy não funciona: ${error}\n`);
    }
  }

  // Teste de proxy com curl
  if (config.proxy.host && config.proxy.user && config.proxy.pass) {
    console.log("\n🧪 Testando proxy com curl...");
    try {
      const proxyUrl = `http://${config.proxy.user}:${config.proxy.pass}@${config.proxy.host}:${config.proxy.port}`;
      const result = execSync(
        `curl -x "${proxyUrl}" -s https://api.ipify.org`,
        { timeout: 30000 }
      );
      console.log(`✅ Proxy funciona! IP: ${result.toString().trim()}`);
    } catch (error) {
      console.log(`❌ Proxy não funciona: ${error}`);
    }
    console.log("");
  }

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
