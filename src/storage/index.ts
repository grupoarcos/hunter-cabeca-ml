import { saveLoja, lojaExists, type LojaDocument } from "../database/index.js";
import type { SellerData } from "../extractors/index.js";
import type { Config } from "../config/index.js";

export interface StorageState {
  processedLinks: Set<string>;
  processedNames: Set<string>;
  processedProducts: Set<string>;
  contador: number;
  paginasSemLojas: number;
  ultimaPaginaComLojas: number;
}

// ========== CRIAR ESTADO INICIAL ==========
export function createStorageState(): StorageState {
  return {
    processedLinks: new Set(),
    processedNames: new Set(),
    processedProducts: new Set(),
    contador: 0,
    paginasSemLojas: 0,
    ultimaPaginaComLojas: 0,
  };
}

// ========== CRIAR DOCUMENTO DA LOJA ==========
export function createLojaDocument(
  contador: number,
  config: Config,
  seller: SellerData
): Omit<LojaDocument, "_id" | "created_at"> {
  const temLocalizacaoBR =
    seller.localizacao?.includes("Brasil") ||
    seller.localizacao?.includes("SP") ||
    seller.localizacao?.includes("RJ") ||
    seller.localizacao?.includes("MG");

  return {
    numero: contador,
    produto_origem: config.produto,
    categoria: config.categoria,
    nome_loja: seller.nome!,
    link_loja: seller.link!,
    vendas_estimadas: seller.vendas,
    mercado_lider: seller.mercadoLider,
    reputacao_verde: seller.reputacaoVerde,
    localizacao: seller.localizacao,
    score_brasil: temLocalizacaoBR ? 9 : 7,
    plataforma: "mercadolivre",
    data_extracao: new Date(),
  };
}

// ========== SALVAR LOJA NO MONGODB ==========
export async function saveLojaToDatabase(
  config: Config,
  seller: SellerData,
  state: StorageState
): Promise<boolean> {
  // Incrementa contador
  state.contador++;

  // Cria documento
  const lojaDoc = createLojaDocument(state.contador, config, seller);

  // Salva no MongoDB
  const saved = await saveLoja(lojaDoc);

  return saved;
}

// ========== VERIFICAR SE LOJA JÁ EXISTE NO DB ==========
export async function checkLojaExistsInDatabase(
  link: string
): Promise<boolean> {
  return await lojaExists(link);
}

// ========== LOG FINAL ==========
export function logStorageStats(state: StorageState): void {
  console.log("\n🎉 ==================== CONCLUÍDO ====================");
  console.log(`✅ Lojas salvas: ${state.contador}`);
  console.log(`📊 Links processados: ${state.processedLinks.size}`);
  console.log(`📄 Última página com lojas: ${state.ultimaPaginaComLojas}`);
}
