import type { PlaywrightCrawlingContext } from "crawlee";
import type { Config } from "../../config/index.js";
import type { StorageState } from "../../storage/index.js";
import type { FilterStats } from "../../filters/index.js";
import { extractSeller } from "../../extractors/index.js";
import { applySellersFilters, logFilterResult } from "../../filters/index.js";
import { saveLojaToDatabase } from "../../storage/index.js";

export async function handleProduto(
  context: PlaywrightCrawlingContext,
  config: Config,
  state: StorageState,
  filterStats: FilterStats
): Promise<void> {
  const { page, request, log } = context;
  const { pagina } = request.userData;

  log.info(`   🛒 Produto: ${request.url.substring(0, 60)}...`);

  await page.goto(request.url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForTimeout(5000); // Espera mais pro card do seller carregar

  // DEBUG: Screenshot do produto
  const timestamp = Date.now();
  const productId = request.url.match(/MLB-?(\d+)/)?.[1] || timestamp;
  await page.screenshot({
    path: `/app/data/debug-produto-${productId}.png`,
    fullPage: false,
  });
  log.info(`   📸 Screenshot: debug-produto-${productId}.png`);

  // DEBUG: Título e URL
  const title = await page.title();
  log.info(`   📄 Título: ${title.substring(0, 50)}...`);

  // DEBUG: Verifica se tem o card do seller
  const sellerCardExists = await page.evaluate(() => {
    const selectors = [
      ".ui-seller-data",
      ".ui-pdp-seller",
      ".ui-box-component-seller-data",
      '[class*="seller-data"]',
      '[class*="seller"]',
    ];

    const results: Record<string, boolean> = {};
    selectors.forEach((sel) => {
      results[sel] = document.querySelector(sel) !== null;
    });
    return results;
  });
  log.info(`   🔍 Card seller existe: ${JSON.stringify(sellerCardExists)}`);

  // DEBUG: Pega o HTML do card do seller (se existir)
  const sellerHtml = await page.evaluate(() => {
    const sellerCard = document.querySelector(
      ".ui-seller-data, .ui-pdp-seller, .ui-box-component-seller-data"
    );
    if (sellerCard) {
      return sellerCard.outerHTML.substring(0, 500) + "...";
    }
    return "NÃO ENCONTRADO";
  });
  log.info(`   📝 HTML do seller: ${sellerHtml.substring(0, 200)}...`);

  // Extrai dados do vendedor
  const seller = await extractSeller(page);

  // Log para debug
  log.info(
    `   📊 Dados: ${seller.nome || "sem nome"} | Vendas: ${
      seller.vendas
    } | ML: ${seller.mercadoLider} | Verde: ${seller.reputacaoVerde}`
  );

  // Aplica filtros
  const filterResult = applySellersFilters(
    seller,
    config,
    state.processedLinks,
    state.processedNames,
    filterStats
  );

  // Log se rejeitado
  logFilterResult(seller, filterResult, log);

  if (!filterResult.approved) {
    return;
  }

  // Adiciona aos processados
  state.processedLinks.add(seller.link!);
  state.processedNames.add(seller.nome!.toLowerCase().trim());

  // Salva direto no MongoDB
  const saved = await saveLojaToDatabase(config, seller, state);

  if (!saved) {
    log.warning(`   ⚠️ Loja já existe no banco: ${seller.nome}`);
    return;
  }

  // Atualiza estado
  state.ultimaPaginaComLojas = pagina;
  state.paginasSemLojas = 0;

  // Log sucesso
  const tags: string[] = [];
  if (seller.mercadoLider) tags.push("🏆ML");
  if (seller.reputacaoVerde) tags.push("💚");
  if (seller.vendas >= 1000) tags.push(`📊${seller.vendas}`);

  log.info(
    `   ✅ [${state.contador}/${config.maxLojas}] ${seller.nome} ${tags.join(
      " "
    )} → MongoDB`
  );
}
