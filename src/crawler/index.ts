import { PlaywrightCrawler, type PlaywrightCrawlingContext } from "crawlee";
import type { Config } from "../config/index.js";
import type { StorageState } from "../storage/index.js";
import type { FilterStats } from "../filters/index.js";
import {
  handleBuscaInicial,
  handleBuscaPaginada,
  handleProduto,
} from "./handlers/index.js";
import {
  getRandomUserAgent,
  buildHeaders,
  randomDelay,
} from "../utils/index.js";

export async function createCrawler(
  config: Config,
  state: StorageState,
  filterStats: FilterStats
): Promise<PlaywrightCrawler> {
  // Monta proxy config pra passar direto no launch
  const hasProxy = config.proxy.host && config.proxy.port;

  const proxyConfig = hasProxy
    ? {
        server: `http://${config.proxy.host}:${config.proxy.port}`,
        username: config.proxy.user || undefined,
        password: config.proxy.pass || undefined,
      }
    : undefined;

  if (proxyConfig) {
    console.log(`🌐 Proxy: ${config.proxy.host}:${config.proxy.port}`);
    console.log(`👤 Proxy User: ${config.proxy.user || "(IP Auth)"}`);
  } else {
    console.log("⚠️  Proxy não configurado, rodando sem proxy");
  }

  const crawler = new PlaywrightCrawler({
    maxConcurrency: config.maxConcurrency,
    requestHandlerTimeoutSecs: config.requestTimeout + config.delayMax,

    launchContext: {
      launchOptions: {
        headless: true,
        proxy: proxyConfig, // Proxy direto aqui!
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
        ],
      },
    },

    preNavigationHooks: [
      async ({ page }, gotoOptions) => {
        const userAgent = getRandomUserAgent();
        const headers = buildHeaders(userAgent);

        await page.setExtraHTTPHeaders(headers);

        await page.addInitScript(() => {
          Object.defineProperty(navigator, "webdriver", {
            get: () => undefined,
          });
        });

        console.log(`   🌐 UA: ${userAgent.substring(0, 50)}...`);
      },
    ],

    async requestHandler(context: PlaywrightCrawlingContext) {
      const { request, log } = context;
      const { label } = request.userData;

      await randomDelay({
        min: config.delayMin * 1000,
        max: config.delayMax * 1000,
      });

      if (state.contador >= config.maxLojas) {
        log.info(`✅ Meta de ${config.maxLojas} lojas atingida!`);
        await crawler.autoscaledPool?.abort();
        return;
      }

      if (state.paginasSemLojas >= config.stopIfNoNewStores) {
        log.info(
          `🛑 Stop adaptativo: ${config.stopIfNoNewStores} páginas sem lojas novas`
        );
        await crawler.autoscaledPool?.abort();
        return;
      }

      try {
        switch (label) {
          case "BUSCA_INICIAL":
            await handleBuscaInicial(context, crawler, config, state);
            break;

          case "BUSCA_PAGINADA":
            await handleBuscaPaginada(context, crawler, config, state);
            break;

          case "PRODUTO":
            await handleProduto(context, config, state, filterStats);
            break;

          default:
            log.warning(`⚠️ Label desconhecido: ${label}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log.error(`❌ ${label}: ${errorMessage}`);
      }
    },
  });

  return crawler;
}

export function buildInitialUrl(produto: string): string {
  const produtoSlug = produto.replace(/ /g, "-").toLowerCase();
  return `https://lista.mercadolivre.com.br/${produtoSlug}`;
}
