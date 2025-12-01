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
    return `http://${proxy.user}:${proxy.pass}@${proxy.host}:${proxy.port}`;
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

  console.log(`🌐 Proxy: ${config.proxy.host}:${config.proxy.port}`);

  return new ProxyConfiguration({
    proxyUrls: [proxyUrl],
  });
}
