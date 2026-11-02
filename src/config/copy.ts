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

// Pinned V7.2 app/error.tsx and app-root ScreenErrorBoundary, copied verbatim.
export const ERROR_COPY = {
  title: 'Instrument fault',
  routeMessage: 'Something interrupted this view. Try again, or reload to restore the instrument.',
  screenMessage: 'A rendering error occurred in this view. Reload to restore the instrument.',
  retry: 'Try again',
  reload: 'Reload',
  screenReload: 'Reload Grantum',
} as const;

// Header/navigation labels from the pinned V7.2 header and TopTabNavigation.
export const HEADER_COPY = { brand: 'Grantum', back: 'Go back' } as const;
export const NAV_COPY = {
  primary: 'Primary',
  dashboard: 'Dashboard',
  discovery: 'Discovery',
  drafting: 'Drafting',
  audit: 'Audit',
  export: 'Export',
  postAward: 'Post-award',
  lockedPreview: 'tier-locked preview, still navigable',
} as const;
// V7.2 GrantDetailModalTemplate labels; API mode must not claim a mock record.
export const MODAL_COPY = {
  close: 'Close',
  funding: 'Funding',
  deadline: 'Deadline',
  region: 'Region',
  record: 'Record',
  mockRecord: 'Indexed · mock',
  apiRecord: 'API response',
  apply: 'Help me apply',
} as const;

// Verbatim V7.2 DashboardContainer labels. Bell/filter remain declared inert.
export const DASHBOARD_COPY = {
  notifications: 'Notifications',
  filter: 'Filter grants',
  newApplication: 'New application',
  recommended: 'Recommended opportunities',
  search: 'Search grants',
  liveMatching: 'Live matching',
  showAll: 'Show all',
} as const;

export const DRAFTING_COPY = {
  title: 'Drafting assistant',
  chips: ['Tighten the mission statement', 'Align budget to funder cap', 'Add evidence references'],
  welcome: (title: string, funder: string): string =>
    `Welcome to the drafting assistant. Current file: ${title} (${funder}). Tell me what your project needs to change, and I will keep the narrative aligned to the funder requirements.`,
} as const;
export const AUDIT_COPY = {
  title: 'Audit agent',
  chips: ['Verify budget math', 'Check eligibility window', 'Confirm evidence references'],
  welcome:
    'AUDIT AGENT ONLINE · deterministic pass armed. Ask me to verify budget math, eligibility windows, or evidence references.',
} as const;
