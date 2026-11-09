export const GRANT_CARD_COPY = {
  funding: 'Funding',
  deadline: 'Deadline',
  details: 'View details',
  apply: 'Help me apply',
  matchLabel: (pct: number): string => `${pct}% match`,
} as const;

export const HERO_CONTINUE_COPY = {
  activeEyebrow: 'Active session',
  inactiveEyebrow: 'Next action',
  untitled: 'Untitled application',
  inactiveTitle: 'Start a new grant application',
  resume: 'Continue drafting',
  start: 'Start application',
} as const;

export const CHAT_COPY = {
  placeholder: 'Add a working note…',
  send: 'Save note',
  now: 'now',
  failed: 'Message failed to send.',
} as const;

export const ERROR_COPY = {
  title: 'Instrument fault',
  routeMessage: 'Something interrupted this view. Try again, or reload to restore the instrument.',
  screenMessage: 'A rendering error occurred in this view. Reload to restore the instrument.',
  retry: 'Try again',
  reload: 'Reload',
  screenReload: 'Reload Grantum',
} as const;

export const HEADER_COPY = { brand: 'Grantum', back: 'Go back', home: 'Go to dashboard' } as const;

export const ROUTE_COPY = {
  loadingTitle: 'Calibrating instrument…',
  unavailableTitle: 'Opportunity unavailable',
  loadingGrant: 'Loading the selected opportunity.',
  backDashboard: 'Back to dashboard',
  faultTitle: 'Instrument fault',
  emptyTitle: 'No opportunities found',
  loadingCatalog: 'Loading your opportunities.',
  emptyCatalog: 'There are no matching opportunities available.',
  retry: 'Try again',
} as const;
export const NAV_COPY = {
  primary: 'Primary',
  dashboard: 'Dashboard',
  discovery: 'Discovery',
  drafting: 'Drafting',
  audit: 'Audit',
  export: 'Export',
  postAward: 'Post-award',
} as const;
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

export const DASHBOARD_COPY = {
  notifications: 'Notifications',
  filter: 'Filter grants',
  newApplication: 'New application',
  recommended: 'Recommended opportunities',
  search: 'Search grants',
  liveMatching: 'Sample opportunities',
  showAll: 'Show all',
} as const;

export const DRAFTING_COPY = {
  title: 'Drafting workspace',
  chips: ['Tighten the mission statement', 'Align budget to funder cap', 'Add evidence references'],
} as const;
export const AUDIT_COPY = {
  title: 'Application check',
  chips: ['Verify budget math', 'Check eligibility window', 'Confirm evidence references'],
  welcome:
    'Run a check to find missing sections. This preview checks section presence; it does not validate budget math, eligibility, or evidence. Notes stay in this session.',
} as const;
