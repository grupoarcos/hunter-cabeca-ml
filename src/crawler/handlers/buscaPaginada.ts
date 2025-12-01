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

  await page.waitForTimeout(5000); // Espera mais

  // DEBUG: Screenshot
  const timestamp = Date.now();
  await page.screenshot({
    path: `/tmp/debug-pagina${pagina}-${timestamp}.png`,
    fullPage: true,
  });
  log.info(`📸 Screenshot salvo: /tmp/debug-pagina${pagina}-${timestamp}.png`);

  // DEBUG: Título e URL
  const title = await page.title();
  log.info(`📄 Título: ${title}`);

  const currentUrl = page.url();
  log.info(`🌐 URL atual: ${currentUrl}`);

  // DEBUG: Verifica captcha/verificação
  const pageContent = await page.content();
  if (
    pageContent.includes("captcha") ||
    pageContent.includes("verification") ||
    pageContent.includes("account-verification")
  ) {
    log.warning("⚠️ DETECTADO: Página de captcha/verificação!");
  }

  // Scroll para carregar produtos
  await scrollToLoadAll(page);

  log.info(`   🌐 URL: ${request.url}`);

  // DEBUG: Contagem de elementos
  const productCount = await page.evaluate(() => {
    const selectors = [
      'a[href*="produto.mercadolivre.com.br/MLB"]',
      'a[href*="/MLB-"]',
      ".ui-search-result__wrapper",
      ".ui-search-layout__item",
      '[class*="ui-search-result"]',
    ];

    const counts: Record<string, number> = {};
    selectors.forEach((sel) => {
      counts[sel] = document.querySelectorAll(sel).length;
    });
    return counts;
  });
  log.info(`📊 Contagem de elementos: ${JSON.stringify(productCount)}`);

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
