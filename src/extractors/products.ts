import type { Page } from "playwright";

export interface ExtractedProduct {
  url: string;
  id: string;
}

export async function extractProducts(page: Page): Promise<ExtractedProduct[]> {
  return await page.evaluate(() => {
    const items: { url: string; id: string }[] = [];
    const seen = new Set<string>();

    // Seletor atualizado: pega os cards de resultado
    const resultCards = document.querySelectorAll(
      ".ui-search-result__wrapper, .ui-search-layout__item"
    );

    resultCards.forEach((card) => {
      // Procura o link dentro do card
      const linkEl = card.querySelector(
        'a[href*="/MLB-"], a[href*="/MLB"], a[href*="mercadolivre.com.br/MLB"]'
      ) as HTMLAnchorElement | null;

      if (!linkEl || !linkEl.href) return;

      const href = linkEl.href;

      // Ignora links de tracking
      if (
        href.includes("click1.mercadolivre") ||
        href.includes("/clicks/") ||
        href.includes("/count") ||
        href.includes("mclics")
      ) {
        return;
      }

      // Extrai o ID do produto (MLB-XXXXXXXXX ou MLBXXXXXXXXX)
      const match = href.match(/MLB-?(\d+)/);
      if (!match) return;

      const produtoId = match[1];
      if (seen.has(produtoId)) return;
      seen.add(produtoId);

      // Monta URL limpa do produto
      const urlLimpa = `https://produto.mercadolivre.com.br/MLB-${produtoId}`;

      items.push({
        url: urlLimpa,
        id: produtoId,
      });
    });

    // Fallback: se não achou nos cards, tenta o método antigo
    if (items.length === 0) {
      const allLinks = document.querySelectorAll("a");

      allLinks.forEach((link) => {
        const href = link.href || "";

        if (
          !href.includes("produto.mercadolivre.com.br/MLB") &&
          !href.includes("mercadolivre.com.br/MLB-") &&
          !href.includes("/MLB-")
        ) {
          return;
        }

        if (
          href.includes("click1.mercadolivre") ||
          href.includes("/clicks/") ||
          href.includes("/count") ||
          href.includes("mclics")
        ) {
          return;
        }

        const match = href.match(/MLB-?(\d+)/);
        if (!match) return;

        const produtoId = match[1];
        if (seen.has(produtoId)) return;
        seen.add(produtoId);

        const urlLimpa = `https://produto.mercadolivre.com.br/MLB-${produtoId}`;

        items.push({
          url: urlLimpa,
          id: produtoId,
        });
      });
    }

    return items;
  });
}
