import type { Page } from "playwright";

export interface SellerData {
  nome: string | null;
  link: string | null;
  vendas: number;
  reputacao: string | null;
  reputacaoVerde: boolean;
  mercadoLider: boolean;
  localizacao: string | null;
  isChinesa: boolean;
  motivoChinesa?: string;
}

export async function extractSeller(page: Page): Promise<SellerData> {
  return await page.evaluate(
    new Function(`
    const dados = {
      nome: null,
      link: null,
      vendas: 0,
      reputacao: null,
      reputacaoVerde: false,
      mercadoLider: false,
      localizacao: null,
      isChinesa: false,
      motivoChinesa: undefined,
    };

    // ========== HELPER: Limpa nome do vendedor ==========
    const cleanName = function(raw) {
      if (!raw) return null;
      let nome = raw.trim();
      
      // Remove prefixos
      const prefixos = ["Vendido por ", "Vendido por: ", "Por ", "Loja oficial ", "Loja Oficial "];
      for (let i = 0; i < prefixos.length; i++) {
        if (nome.startsWith(prefixos[i])) {
          nome = nome.substring(prefixos[i].length).trim();
        }
      }
      
      // Remove sufixos
      const sufixos = [" | Mercado Livre", " - Mercado Livre", " | MercadoLivre"];
      for (let i = 0; i < sufixos.length; i++) {
        if (nome.endsWith(sufixos[i])) {
          nome = nome.substring(0, nome.length - sufixos[i].length).trim();
        }
      }
      
      return nome || null;
    };

    // ========== NOME DO VENDEDOR ==========
    // Tenta E-shop primeiro (card completo)
    const nomeEshop = document.querySelector(".ui-seller-data-header__title");
    if (nomeEshop && nomeEshop.textContent) {
      dados.nome = cleanName(nomeEshop.textContent);
    }
    
    // Fallback: vendedor clássico (link com "Vendido por")
    if (!dados.nome) {
      const linkClassico = document.querySelector('a[href*="_CustId_"]');
      if (linkClassico && linkClassico.textContent) {
        dados.nome = cleanName(linkClassico.textContent);
      }
    }
    
    // Fallback: qualquer link de vendedor
    if (!dados.nome) {
      const linkVendedor = document.querySelector('a[href*="/pagina/"]');
      if (linkVendedor && linkVendedor.textContent) {
        dados.nome = cleanName(linkVendedor.textContent);
      }
    }

    // ========== LINK DO VENDEDOR ==========
    // E-shop
    const linkEshop = document.querySelector(".ui-seller-data-header__logo-container a");
    if (linkEshop && linkEshop.href) {
      dados.link = linkEshop.href;
    }
    
    // Fallback: vendedor clássico
    if (!dados.link) {
      const linkClassico = document.querySelector('a[href*="_CustId_"]');
      if (linkClassico && linkClassico.href) {
        dados.link = linkClassico.href;
      }
    }
    
    // Fallback: link no footer
    if (!dados.link) {
      const linkFooter = document.querySelector(".ui-seller-data-footer__container a");
      if (linkFooter && linkFooter.href) {
        dados.link = linkFooter.href;
      }
    }
    
    // Fallback: qualquer link de pagina
    if (!dados.link) {
      const linkPagina = document.querySelector('a[href*="/pagina/"]');
      if (linkPagina && linkPagina.href) {
        dados.link = linkPagina.href;
      }
    }

    // ========== VENDAS ==========
    // Procura todos os info boxes e acha o de vendas
    const allInfos = document.querySelectorAll(".ui-seller-data-status__info");
    for (let i = 0; i < allInfos.length; i++) {
      const info = allInfos[i];
      const subtitle = info.querySelector(".ui-seller-data-status__info-subtitle");
      if (subtitle && subtitle.textContent && subtitle.textContent.toLowerCase().includes("venda")) {
        const title = info.querySelector(".ui-seller-data-status__info-title");
        if (title && title.textContent) {
          const texto = title.textContent.trim().toLowerCase();
          if (texto.includes("mil")) {
            const num = parseFloat(texto.replace(/[^0-9.,]/g, "").replace(",", "."));
            dados.vendas = Math.round(num * 1000);
          } else {
            dados.vendas = parseInt(texto.replace(/[^0-9]/g, "")) || 0;
          }
        }
        break;
      }
    }
    
    // Fallback: vendedor clássico (texto no card)
    if (dados.vendas === 0) {
      const sellerInfo = document.querySelector(".ui-pdp-seller__header__info, .ui-box-component-seller-data");
      if (sellerInfo) {
        const texto = sellerInfo.textContent || "";
        const match = texto.match(/(\\+?\\d+(?:[.,]\\d+)?)\\s*mil?\\s*vendas?/i);
        if (match) {
          const num = parseFloat(match[1].replace(",", "."));
          dados.vendas = match[0].toLowerCase().includes("mil") ? Math.round(num * 1000) : Math.round(num);
        }
      }
    }

    // ========== MERCADOLÍDER ==========
    const liderEl = document.querySelector(".ui-seller-data-status__title");
    if (liderEl && liderEl.textContent) {
      const texto = liderEl.textContent.toLowerCase();
      if (texto.includes("mercadolíder") || texto.includes("mercadolider")) {
        dados.mercadoLider = true;
        dados.reputacao = liderEl.textContent.trim();
      }
    }

    // ========== REPUTAÇÃO VERDE ==========
    const textoVerde = document.querySelector(".ui-pdp-color--GREEN");
    const thermometer5 = document.querySelector(".thermometer__level--5");
    const thermometerValue5 = document.querySelector('.ui-seller-data-status__thermometer[value="5"]');
    
    dados.reputacaoVerde = !!(textoVerde || thermometer5 || thermometerValue5 || dados.mercadoLider);

    // ========== LOCALIZAÇÃO ==========
    const locEl = document.querySelector(".ui-seller-data-header__subtitle");
    if (locEl && locEl.textContent) {
      dados.localizacao = locEl.textContent.trim();
    }

    // ========== DETECTAR COMPRA INTERNACIONAL (CHINÊS) ==========
    const cbtSummary = document.querySelector("#cbt_summary, .ui-pdp-container__row--cbt-summary, [class*='cbt-summary'], [class*='cbt_summary']");
    if (cbtSummary) {
      const cbtText = cbtSummary.textContent ? cbtSummary.textContent.toLowerCase() : "";
      if (cbtText.includes("compra internacional")) {
        dados.isChinesa = true;
        dados.motivoChinesa = "compra_internacional";
      }
    }

    return dados;
  `) as () => SellerData
  );
}
