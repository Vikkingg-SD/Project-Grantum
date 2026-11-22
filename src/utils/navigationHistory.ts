export const PREVIOUS_DESTINATION_LIMIT = 10;
export const MAX_HISTORY_ENTRIES = PREVIOUS_DESTINATION_LIMIT + 1;

export const LIFECYCLE_VIEW_PATHS = [
  'dashboard',
  'discovery-studio',
  'drafting',
  'audit-studio',
  'export-humanizer',
  'progress-tracking',
] as const;

const LIFECYCLE_VIEW_SET = new Set<string>(LIFECYCLE_VIEW_PATHS);
const WORKSPACE_BACKABLE_PATHS = new Set<string>([
  '/form-templates',
  '/discover',
  '/my-works',
  '/project-profile',
  '/settings',
  '/plans',
  '/affiliate-campaign',
]);

export interface NavVisit {
  key: string;
  href: string;
}

export interface NavHistory {
  visits: NavVisit[];
  index: number;
}

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;
const DOT_SEGMENT_PATTERN = /(^|\/)\.\.?(\/|$)/;

function isUnsafeSegment(value: string): boolean {
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed.length > 128 ||
    CONTROL_CHAR_PATTERN.test(value) ||
    value.includes('\\') ||
    trimmed === '.' ||
    trimmed === '..' ||
    DOT_SEGMENT_PATTERN.test(trimmed)
  );
}

export function isValidGrantId(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  let current = raw;
  if (isUnsafeSegment(current)) return false;
  // Decode iteratively (up to 3 passes) so double- or triple-encoded traversal segments fail closed.
  for (let pass = 0; pass < 3; pass++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return false;
    }
    if (isUnsafeSegment(next)) return false;
    if (next === current) break;
    current = next;
  }
  return true;
}

export function normalizePathname(href: string): string {
  const path = href.split(/[?#]/, 1)[0] || '/';
  return path.length > 1 && path.endsWith('/') ? path.replace(/\/+$/, '') : path;
}

export function isLifecyclePath(pathname: string): boolean {
  const clean = normalizePathname(pathname);
  const [, root, grant, view, extra] = clean.split('/');
  return (
    root === 'grants' &&
    Boolean(grant && isValidGrantId(grant) && LIFECYCLE_VIEW_SET.has(view)) &&
    extra === undefined
  );
}

export function isWorkspaceShellPath(pathname: string): boolean {
  const clean = normalizePathname(pathname);
  return WORKSPACE_BACKABLE_PATHS.has(clean) || clean === '/admin' || isLifecyclePath(clean);
}

export function isBackTargetPath(href: string, invalidPaths?: ReadonlySet<string>): boolean {
  const clean = normalizePathname(href);
  if (invalidPaths?.has(clean)) return false;
  if (clean === '/admin' || clean === '/onboarding' || clean === '/roadmap') return false;
  return WORKSPACE_BACKABLE_PATHS.has(clean) || isLifecyclePath(clean);
}

export function recordHistoryVisit(
  history: NavHistory,
  visit: NavVisit,
  browserTraversal: boolean
): NavHistory {
  const { visits, index } = history;
  const existingIndex = visits.findIndex((entry) => entry.key === visit.key);
  if (existingIndex !== -1) {
    if (existingIndex === index && visits[index].href === visit.href) return history;
    const updated = [...visits];
    updated[existingIndex] = visit;
    return { visits: updated, index: existingIndex };
  }
  const next = browserTraversal ? [visit] : [...visits.slice(0, index + 1), visit];
  const bounded = next.slice(-MAX_HISTORY_ENTRIES);
  return { visits: bounded, index: bounded.length - 1 };
}

/**
 * Reconciles native stack history against the live route keys in React Navigation state.
 * Dropping keys that were removed by router.replace() or <Redirect> keeps visits aligned
 * with the real native stack so router.back() can never pop into replaced/skipped routes.
 */
export function reconcileNativeHistory(
  history: NavHistory,
  activeKeys: readonly string[],
  currentVisit: NavVisit
): NavHistory {
  const liveKeys = new Set(activeKeys);
  liveKeys.add(currentVisit.key);
  const retained = history.visits.filter((entry) => liveKeys.has(entry.key));
  const currentIndex = retained.findIndex((entry) => entry.key === currentVisit.key);
  if (currentIndex !== -1) {
    const updated = [...retained];
    updated[currentIndex] = currentVisit;
    return { visits: updated, index: currentIndex };
  }
  const bounded = [...retained, currentVisit].slice(-MAX_HISTORY_ENTRIES);
  return { visits: bounded, index: bounded.length - 1 };
}

/**
 * Native router.back() is only safe when the route immediately beneath the currently focused
 * route in React Navigation's live stack matches the exact approved back target key.
 */
export function canUseNativeRouterBack(activeKeys: readonly string[], targetKey: string): boolean {
  if (activeKeys.length < 2) return false;
  return activeKeys[activeKeys.length - 2] === targetKey;
}

/**
 * Truncates visits to previousIndex and binds currentKey to targetHref so a router.replace()
 * fallback never leaves stale forward entries that could cause a Back loop.
 */
export function applyFallbackBack(
  history: NavHistory,
  previousIndex: number,
  currentKey: string | null,
  targetHref: string
): NavHistory {
  if (previousIndex < 0 || previousIndex >= history.visits.length) return history;
  const target = history.visits[previousIndex];
  const truncated = history.visits.slice(0, previousIndex);
  truncated.push({ key: currentKey ?? target.key, href: targetHref });
  return { visits: truncated, index: truncated.length - 1 };
}

export function findPreviousBackIndex(
  history: NavHistory,
  currentPathname: string,
  invalidPaths?: ReadonlySet<string>
): number {
  const cleanCurrent = normalizePathname(currentPathname);
  if (!isWorkspaceShellPath(cleanCurrent)) return -1;
  const current = history.visits[history.index];
  if (!current || normalizePathname(current.href) !== cleanCurrent) return -1;
  for (let i = history.index - 1; i >= 0; i--) {
    const candidate = history.visits[i];
    const candidatePath = normalizePathname(candidate.href);
    if (candidatePath !== cleanCurrent && isBackTargetPath(candidate.href, invalidPaths)) {
      return i;
    }
  }
  return -1;
}

export function resolveHomeDestination(
  currentPathname: string,
  lastLifecyclePath: string | null,
  invalidPaths?: ReadonlySet<string>
): string | null {
  const cleanCurrent = normalizePathname(currentPathname);
  const currentInvalid = Boolean(invalidPaths?.has(cleanCurrent));
  const cleanLast =
    lastLifecyclePath &&
    isLifecyclePath(lastLifecyclePath) &&
    !invalidPaths?.has(normalizePathname(lastLifecyclePath))
      ? normalizePathname(lastLifecyclePath)
      : null;
  if (cleanLast) {
    return cleanCurrent === cleanLast && !currentInvalid ? null : cleanLast;
  }
  if (currentInvalid) {
    return '/dashboard';
  }
  if (isLifecyclePath(cleanCurrent) || cleanCurrent === '/dashboard') {
    return null;
  }
  return '/dashboard';
}

export function isLocalHttpOrigin(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value.trim());
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(
  value: string,
  options: { allowLocalHttp?: boolean } = {}
): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || /[\s\u0000-\u001f\u007f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) return false;
    const isLocalHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
    if (parsed.protocol === 'https:') {
      return parsed.hostname.includes('.') || (Boolean(options.allowLocalHttp) && isLocalHost);
    }
    if (options.allowLocalHttp && parsed.protocol === 'http:') {
      return isLocalHost;
    }
    return false;
  } catch {
    return false;
  }
}
