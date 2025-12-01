import type { PlaywrightCrawlingContext, PlaywrightCrawler } from "crawlee";
import type { Config } from "../../config/index.js";
import type { StorageState } from "../../storage/index.js";
import { extractProducts } from "../../extractors/index.js";
import { scrollToLoadAll } from "../../utils/index.js";

export async function handleBuscaInicial(
  context: PlaywrightCrawlingContext,
  crawler: PlaywrightCrawler,
  config: Config,
  state: StorageState
): Promise<void> {
  const { page, request, log } = context;

  log.info(`🔍 Busca inicial: ${config.produto}`);

  await page.goto(request.url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000); // Espera mais

  // DEBUG: Screenshot pra ver o que carregou
  const timestamp = Date.now();
  await page.screenshot({
    path: `/tmp/debug-busca-${timestamp}.png`,
    fullPage: true,
  });
  log.info(`📸 Screenshot salvo: /tmp/debug-busca-${timestamp}.png`);

  // DEBUG: Log do título da página
  const title = await page.title();
  log.info(`📄 Título da página: ${title}`);

  // DEBUG: Log da URL atual
  const currentUrl = page.url();
  log.info(`🌐 URL atual: ${currentUrl}`);

  // DEBUG: Verifica se tem captcha ou verificação
  const pageContent = await page.content();
  if (
    pageContent.includes("captcha") ||
    pageContent.includes("verification") ||
    pageContent.includes("account-verification")
  ) {
    log.warning("⚠️ DETECTADO: Página de captcha/verificação!");
  }

  // Scroll para carregar todos os produtos
  log.info("   📜 Fazendo scroll...");
  const totalLoaded = await scrollToLoadAll(page);
  log.info(`   📜 Scroll completo: ${totalLoaded} produtos carregados`);

  // Pega a URL final (depois do redirect do ML)
  const urlFinal = page.url();
  log.info(`   🌐 URL final: ${urlFinal}`);

  // DEBUG: Conta quantos elementos de produto existem
  const productCount = await page.evaluate(() => {
    const selectors = [
      'a[href*="produto.mercadolivre.com.br/MLB"]',
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

  // Extrai categoria da URL
  const urlParts = urlFinal
    .replace("https://lista.mercadolivre.com.br/", "")
    .split("/");
  let categoria = "";
  let termoBusca = config.produto.replace(/ /g, "-").toLowerCase();

  if (urlParts.length > 1) {
    categoria = urlParts.slice(0, -1).join("/");
    termoBusca = urlParts[urlParts.length - 1].split("_")[0];
    log.info(`   📁 Categoria detectada: ${categoria}`);
    log.info(`   🔎 Termo de busca: ${termoBusca}`);
  } else {
    termoBusca = urlParts[0].split("_")[0];
    log.info("   📁 Sem categoria específica");
  }

  // Extrai produtos da primeira página
  const produtos = await extractProducts(page);
  log.info(`   📦 ${produtos.length} produtos na página inicial`);

  // Adiciona produtos à fila
  let novos = 0;
  for (const prod of produtos) {
    if (!state.processedProducts.has(prod.id)) {
      state.processedProducts.add(prod.id);
      await crawler.addRequests([
        {
          url: prod.url,
          userData: { label: "PRODUTO", pagina: 0 },
        },
      ]);
      novos++;
    }
  }
  log.info(`   ➕ ${novos} produtos novos adicionados`);

  // Gera URLs das próximas páginas
  for (let p = 1; p <= 3; p++) {
    const offset = p * 50 + 1;
    let paginaUrl: string;

    if (categoria) {
      paginaUrl = `https://lista.mercadolivre.com.br/${categoria}/${termoBusca}_Desde_${offset}_NoIndex_True`;
    } else {
      paginaUrl = `https://lista.mercadolivre.com.br/${termoBusca}_Desde_${offset}_NoIndex_True`;
    }

    await crawler.addRequests([
      {
        url: paginaUrl,
        userData: {
          label: "BUSCA_PAGINADA",
          pagina: p + 1,
          categoria,
          termoBusca,
        },
      },
    ]);
  }
  log.info("   📄 Páginas adicionais geradas");
}
