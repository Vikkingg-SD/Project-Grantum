export const DEFAULT_REQUIRED_SECTIONS: readonly string[] = [
  'Mission',
  'Pain',
  'Solution',
  'Market',
  'Competitors',
  'Moat',
] as const;

export const TIERS = {
  match: { pass: 80, warn: 40 },
  confidence: { pass: 85, warn: 40 },
} as const;

export const MAX_INPUT_CHARS = 10_000;
export const SCAN_SETTLE_MS = 3_000;
export const HISTORY_CAP = 19;
export const DEFAULT_POLLING_MS = 1_000;
