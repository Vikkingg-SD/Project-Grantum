function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Public timing configuration must be a positive finite number.');
  }
  return parsed;
}

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  API_TIMEOUT_MS: positiveNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15000),
  POLLING_INTERVAL_MS: positiveNumber(process.env.EXPO_PUBLIC_POLLING_INTERVAL_MS, 1000),
  DATA_SOURCE: (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock') as 'api' | 'mock',
  MOCK_LATENCY_MS: Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 350),
} as const;
