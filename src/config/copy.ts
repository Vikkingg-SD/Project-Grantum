export const GRANT_CARD_COPY = {
  funding: 'Funding',
  deadline: 'Deadline',
  details: 'View details',
  apply: 'Help me apply',
  matchLabel: (pct: number): string => `${pct}% match`,
} as const;

export const CONFIDENCE_COPY = {
  label: 'confidence',
  unlocked: 'Export unlocked',
  locked: 'Export locked',
  thresholdPrefix: 'Threshold: ',
  thresholdSuffix: ' confidence',
} as const;

export const HERO_CONTINUE_COPY = {
  activeEyebrow: 'Active session',
  inactiveEyebrow: 'Next action',
  untitled: 'Untitled application',
  inactiveTitle: 'Start a new grant application',
  progress: 'Almost there',
  resume: 'Continue drafting',
  start: 'Start application',
} as const;

export const CHAT_COPY = {
  placeholder: 'Describe what you want to draft',
  send: 'Send message',
  now: 'now',
  failed: 'Message failed to send.',
} as const;
