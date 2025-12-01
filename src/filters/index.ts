import type { SellerData } from "../extractors/index.js";
import type { Config } from "../config/index.js";

export interface FilterResult {
  approved: boolean;
  reason?: string;
}

export interface FilterStats {
  chinesas: number;
  semVendas: number;
  reputacaoBaixa: number;
  duplicadas: number;
  nomeDuplicado: number;
}

export function createFilterStats(): FilterStats {
  return {
    chinesas: 0,
    semVendas: 0,
    reputacaoBaixa: 0,
    duplicadas: 0,
    nomeDuplicado: 0,
  };
}

// ========== FILTROS INDIVIDUAIS ==========

export function isChineseSeller(seller: SellerData): boolean {
  return seller.isChinesa;
}

export function hasMinimumSales(
  seller: SellerData,
  minVendas: number
): boolean {
  return seller.vendas >= minVendas;
}

export function hasGreenReputation(seller: SellerData): boolean {
  return seller.reputacaoVerde;
}

export function isDuplicateLink(
  link: string,
  processedLinks: Set<string>
): boolean {
  return processedLinks.has(link);
}

export function isDuplicateName(
  nome: string,
  processedNames: Set<string>
): boolean {
  const normalized = nome.toLowerCase().trim();
  return processedNames.has(normalized);
}

// ========== FILTRO PRINCIPAL ==========

export function applySellersFilters(
  seller: SellerData,
  config: Config,
  processedLinks: Set<string>,
  processedNames: Set<string>,
  stats: FilterStats
): FilterResult {
  // Validação básica
  if (!seller.nome || !seller.link) {
    return { approved: false, reason: "sem_dados" };
  }

  // Filtro: Link duplicado
  if (isDuplicateLink(seller.link, processedLinks)) {
    stats.duplicadas++;
    return { approved: false, reason: "link_duplicado" };
  }

  // Filtro: Nome duplicado
  if (isDuplicateName(seller.nome, processedNames)) {
    stats.nomeDuplicado++;
    return { approved: false, reason: "nome_duplicado" };
  }

  // Filtro: Chinesa
  if (isChineseSeller(seller)) {
    stats.chinesas++;
    return { approved: false, reason: "chinesa" };
  }

  // Filtro: Vendas mínimas
  if (!hasMinimumSales(seller, config.minVendasLoja)) {
    stats.semVendas++;
    return { approved: false, reason: "vendas_baixas" };
  }

  // Filtro: Reputação verde
  if (config.apenasReputacaoVerde && !hasGreenReputation(seller)) {
    stats.reputacaoBaixa++;
    return { approved: false, reason: "reputacao_baixa" };
  }

  return { approved: true };
}

// ========== LOG DO FILTRO ==========

export function logFilterResult(
  seller: SellerData,
  result: FilterResult,
  logger: { info: (msg: string) => void }
): void {
  if (result.approved) return;

  const reasons: Record<string, string> = {
    sem_dados: "⚠️ Vendedor sem dados",
    link_duplicado: `⏭️ Link duplicado: ${seller.nome}`,
    nome_duplicado: `⏭️ Nome duplicado: ${seller.nome}`,
    chinesa: `❌ Chinesa (${seller.motivoChinesa}): ${seller.nome}`,
    vendas_baixas: `❌ Vendas baixas (${seller.vendas}): ${seller.nome}`,
    reputacao_baixa: `❌ Reputação não verde: ${seller.nome}`,
  };

  const msg = reasons[result.reason || ""] || `❌ Rejeitada: ${seller.nome}`;
  logger.info(`   ${msg}`);
}

// ========== RELATÓRIO FINAL ==========

export function logFilterStats(stats: FilterStats): void {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  console.log(`❌ Lojas rejeitadas: ${total}`);
  console.log(`   ├─ Chinesas: ${stats.chinesas}`);
  console.log(`   ├─ Sem vendas: ${stats.semVendas}`);
  console.log(`   ├─ Reputação baixa: ${stats.reputacaoBaixa}`);
  console.log(`   ├─ Link duplicado: ${stats.duplicadas}`);
  console.log(`   └─ Nome duplicado: ${stats.nomeDuplicado}`);
}
