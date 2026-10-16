export const CONSTANTS = {
  // Volatile required-section universe per Next.js V7.2
  REQUIRED_DRAFT_SECTIONS: [
    'Mission',
    'Pain',
    'Solution',
    'Market',
    'Competitors',
    'Moat',
  ] as const,

  // Compliance and audit thresholds (Strict single source)
  CONFIDENCE_THRESHOLD: 85,
  MATCH_THRESHOLD: 80,
  WARN_THRESHOLD: 40,

  // Timing and input invariants
  MAX_INPUT_CHARS: 10000,
  SCAN_SETTLE_MS: 3000,
  HISTORY_CAP: 19,
  DEFAULT_POLLING_MS: 3000,
} as const;

export const MATCH_TIER = {
  pass: CONSTANTS.MATCH_THRESHOLD,
  warn: CONSTANTS.WARN_THRESHOLD,
} as const;

export const CONFIDENCE_TIER = {
  pass: CONSTANTS.CONFIDENCE_THRESHOLD,
  warn: CONSTANTS.WARN_THRESHOLD,
} as const;
