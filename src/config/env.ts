function positiveNumber(value: string | undefined, fallback: number, allowZero = false): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error('Public timing configuration must be a positive finite number.');
  }
  return parsed;
}

const dataMode = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
if (dataMode !== 'api' && dataMode !== 'mock') {
  throw new Error('EXPO_PUBLIC_DATA_SOURCE must be api or mock.');
}

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  API_TIMEOUT_MS: positiveNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15000),
  POLLING_INTERVAL_MS: positiveNumber(process.env.EXPO_PUBLIC_POLLING_INTERVAL_MS, 1000),
  DATA_SOURCE: dataMode,
  MOCK_LATENCY_MS: positiveNumber(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS, 350, true),
} as const;
