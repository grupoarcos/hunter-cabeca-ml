import type { Page } from "playwright";

export interface ScrollOptions {
  maxScrolls?: number;
  waitTime?: number;
  selector?: string;
}

export async function scrollToLoadAll(
  page: Page,
  options: ScrollOptions = {}
): Promise<number> {
  const {
    maxScrolls = 20,
    waitTime = 2000,
    selector = 'a[href*="produto.mercadolivre.com.br/MLB"]',
  } = options;

  let previousHeight = 0;
  let previousCount = 0;
  let scrollCount = 0;

  while (scrollCount < maxScrolls) {
    // Scroll até o fim
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(waitTime);

    // Conta elementos
    const currentCount = await page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, selector);

    // Pega altura atual
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // Para se não mudou nada
    if (currentHeight === previousHeight && currentCount === previousCount) {
      break;
    }

    previousHeight = currentHeight;
    previousCount = currentCount;
    scrollCount++;
  }

  return previousCount;
}
