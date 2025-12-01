import type { Page } from "playwright";

export interface ExtractedProduct {
  url: string;
  id: string;
}

export async function extractProducts(page: Page): Promise<ExtractedProduct[]> {
  return await page.evaluate(() => {
    const items: { url: string; id: string }[] = [];
    const seen = new Set<string>();

    const allLinks = document.querySelectorAll("a");

    allLinks.forEach((link) => {
      const href = link.href || "";

      // Só aceita links de produto do ML
      if (
        !href.includes("produto.mercadolivre.com.br/MLB") &&
        !href.includes("mercadolivre.com.br/MLB-")
      ) {
        return;
      }

      // Ignora links de tracking
      if (
        href.includes("click1.mercadolivre") ||
        href.includes("/clicks/") ||
        href.includes("/count") ||
        href.includes("mclics")
      ) {
        return;
      }

      // Extrai o ID do produto
      const match = href.match(/MLB-?(\d+)/);
      if (!match) return;

      const produtoId = match[1];
      if (seen.has(produtoId)) return;
      seen.add(produtoId);

      // Limpa a URL
      let urlLimpa = href.split("?")[0].split("#")[0];

      // Normaliza para formato padrão
      if (!urlLimpa.includes("produto.mercadolivre.com.br")) {
        urlLimpa = `https://produto.mercadolivre.com.br/MLB-${produtoId}`;
      }

      items.push({
        url: urlLimpa,
        id: produtoId,
      });
    });

    return items;
  });
}
