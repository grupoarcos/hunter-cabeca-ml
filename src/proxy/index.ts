import { ProxyConfiguration } from "crawlee";
import type { Config } from "../config/index.js";

export interface ProxyConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
}

export function buildProxyUrl(proxy: ProxyConfig): string | null {
  if (!proxy.host || !proxy.port) {
    return null;
  }

  if (proxy.user && proxy.pass) {
    // Encoda user e pass pra evitar problemas com caracteres especiais
    const user = encodeURIComponent(proxy.user);
    const pass = encodeURIComponent(proxy.pass);
    return `http://${user}:${pass}@${proxy.host}:${proxy.port}`;
  }

  return `http://${proxy.host}:${proxy.port}`;
}

export async function createProxyConfiguration(
  config: Config
): Promise<ProxyConfiguration | undefined> {
  const proxyUrl = buildProxyUrl(config.proxy);

  if (!proxyUrl) {
    console.log("⚠️  Proxy não configurado, rodando sem proxy");
    return undefined;
  }

  // Log com senha mascarada
  const urlSafe = proxyUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🌐 Proxy: ${config.proxy.host}:${config.proxy.port}`);
  console.log(`🔐 Proxy URL: ${urlSafe}`);
  console.log(`👤 Proxy User: ${config.proxy.user}`);

  return new ProxyConfiguration({
    proxyUrls: [proxyUrl],
  });
}
