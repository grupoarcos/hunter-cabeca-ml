import type { PlaywrightCrawlingContext, PlaywrightCrawler } from "crawlee";
import type { Config } from "../../config/index.js";
import type { StorageState } from "../../storage/index.js";
import { extractProducts } from "../../extractors/index.js";
import { scrollToLoadAll } from "../../utils/index.js";

export async function handleBuscaPaginada(
  context: PlaywrightCrawlingContext,
  crawler: PlaywrightCrawler,
  config: Config,
  state: StorageState
): Promise<void> {
  const { page, request, log } = context;
  const { pagina } = request.userData;

  log.info(`🔍 Página ${pagina} - Buscando produtos...`);

  await page.goto(request.url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  // Scroll para carregar produtos
  await scrollToLoadAll(page);

  log.info(`   🌐 URL: ${request.url}`);

  // Extrai produtos
  const produtos = await extractProducts(page);
  log.info(`   📦 ${produtos.length} produtos encontrados`);

  if (produtos.length === 0) {
    log.warning(`   ⚠️ Nenhum produto na página ${pagina}`);
    state.paginasSemLojas++;
    return;
  }

  // Reset contador de páginas vazias
  state.paginasSemLojas = 0;

  // Log dos primeiros IDs
  log.info(
    `   🔗 IDs: ${produtos
      .slice(0, 5)
      .map((p) => p.id)
      .join(", ")}`
  );

  // Adiciona produtos novos à fila
  let novos = 0;
  for (const prod of produtos) {
    if (!state.processedProducts.has(prod.id)) {
      state.processedProducts.add(prod.id);
      await crawler.addRequests([
        {
          url: prod.url,
          userData: { label: "PRODUTO", pagina },
        },
      ]);
      novos++;
    }
  }
  log.info(
    `   ➕ ${novos} produtos novos (${state.processedProducts.size} total)`
  );
}
