export const ENV = {
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1',
  API_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000),
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === '1',
  POLLING_INTERVAL_MS: Number(process.env.EXPO_PUBLIC_POLLING_INTERVAL_MS ?? 1000),
  DATA_SOURCE: (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock') as 'api' | 'mock',
  MOCK_LATENCY_MS: Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 350),
} as const;
