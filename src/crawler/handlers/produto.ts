import type { PlaywrightCrawlingContext } from "crawlee";
import type { Config } from "../../config/index.js";
import type { StorageState } from "../../storage/index.js";
import type { FilterStats } from "../../filters/index.js";
import { extractSeller } from "../../extractors/index.js";
import { applySellersFilters, logFilterResult } from "../../filters/index.js";
import { saveLojaToDatabase } from "../../storage/index.js";
import fs from "fs";

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

  await page.waitForTimeout(5000);

  // DEBUG: Screenshot
  const productId = request.url.match(/MLB-?(\d+)/)?.[1] || Date.now();

  try {
    // Salva screenshot em arquivo
    const screenshotPath = `/app/data/debug-produto-${productId}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    log.info(`   📸 Screenshot salvo: ${screenshotPath}`);
  } catch (e) {
    log.warning(`   ⚠️ Erro ao salvar screenshot: ${e}`);
  }

  // DEBUG: Título
  const title = await page.title();
  log.info(`   📄 Título: ${title.substring(0, 60)}...`);

  // DEBUG: URL atual (pra ver se redirecionou)
  const currentUrl = page.url();
  log.info(`   🌐 URL atual: ${currentUrl.substring(0, 80)}...`);

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
  log.info(`   🔍 Card seller: ${JSON.stringify(sellerCardExists)}`);

  // DEBUG: Pega o HTML do card do seller
  const sellerHtml = await page.evaluate(() => {
    const sellerCard = document.querySelector(
      ".ui-seller-data, .ui-pdp-seller, .ui-box-component-seller-data, [class*='seller']"
    );
    if (sellerCard) {
      return sellerCard.outerHTML.substring(0, 800);
    }
    return "NÃO ENCONTRADO";
  });
  log.info(`   📝 HTML seller: ${sellerHtml.substring(0, 300)}...`);

  // Extrai dados do vendedor
  const seller = await extractSeller(page);

  log.info(
    `   📊 Dados: ${seller.nome || "sem nome"} | Vendas: ${
      seller.vendas
    } | ML: ${seller.mercadoLider} | Verde: ${seller.reputacaoVerde}`
  );

  // Se não achou dados, pula
  if (!seller.nome || seller.nome === "sem nome") {
    log.warning(`   ⚠️ Vendedor sem dados - pulando`);
    return;
  }

  // Aplica filtros
  const filterResult = applySellersFilters(
    seller,
    config,
    state.processedLinks,
    state.processedNames,
    filterStats
  );

  logFilterResult(seller, filterResult, log);

  if (!filterResult.approved) {
    return;
  }

  // Adiciona aos processados
  state.processedLinks.add(seller.link!);
  state.processedNames.add(seller.nome!.toLowerCase().trim());

  // Salva no MongoDB
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
