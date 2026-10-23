export const ENV = {
  POLLING_INTERVAL_MS: Number(process.env.EXPO_PUBLIC_POLLING_INTERVAL_MS ?? 1000),
  DATA_SOURCE: (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock') as 'api' | 'mock',
  MOCK_LATENCY_MS: Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 350),
} as const;
