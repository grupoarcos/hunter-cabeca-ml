export interface DelayOptions {
  min?: number;
  max?: number;
}

export function getRandomDelay(options: DelayOptions = {}): number {
  const { min = 0, max = 90000 } = options; // 0 a 90 segundos em ms
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function randomDelay(options: DelayOptions = {}): Promise<void> {
  const delay = getRandomDelay(options);
  console.log(`   ⏳ Aguardando ${(delay / 1000).toFixed(1)}s...`);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
