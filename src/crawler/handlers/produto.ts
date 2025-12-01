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

  log.info(`   🛒 Produto: ${request.url.substring(0, 80)}...`);

  await page.goto(request.url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForTimeout(3000);

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

  // Adiciona aos processados (em memória pra evitar duplicatas na mesma execução)
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
