import type { Href } from 'expo-router';
import { isValidGrantId, workspaceDestination } from '@/utils/navigationHistory';

const STATIC_RETURN_PATHS = new Set([
  '/form-templates',
  '/discover',
  '/my-works',
  '/project-profile',
  '/settings',
]);
const GRANT_RETURN_VIEWS = new Set([
  'dashboard',
  'discovery-studio',
  'drafting',
  'audit-studio',
  'export-humanizer',
  'progress-tracking',
]);

// Accept only safe local user workspace destinations, never arbitrary links,
// onboarding, roadmap, or staff administration routes from query params.
export function workspaceReturnPath(value: string | string[] | undefined): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || /[#\\]/.test(candidate)) return '/dashboard';
  const [pathname, query, extra] = candidate.split('?');
  if (
    extra !== undefined ||
    (query !== undefined && !/^attemptId=[A-Za-z0-9._~%-]+$/.test(query))
  ) {
    return '/dashboard';
  }
  const suffix = query ? '?' + query : '';
  if (STATIC_RETURN_PATHS.has(pathname)) {
    return (pathname === '/form-templates' ? pathname + suffix : pathname) as Href;
  }
  const parts = pathname.split('/');
  if (parts.length === 4 && parts[0] === '' && parts[1] === 'grants' && isValidGrantId(parts[2])) {
    const view = parts[3] === 'post-award-tracker' ? 'progress-tracking' : parts[3];
    if (GRANT_RETURN_VIEWS.has(view)) {
      return (`/grants/${parts[2]}/${view}` + suffix) as Href;
    }
  }
  return '/dashboard';
}

export function workspaceReturnHref(
  pathname: '/plans' | '/affiliate-campaign',
  returnTo: string | string[] | undefined
): Href {
  const safeReturn = workspaceReturnPath(returnTo);
  if (safeReturn !== '/dashboard') {
    return { pathname, params: { returnTo: String(safeReturn) } };
  }
  return pathname;
}

export function returnToWorkspace(params: {
  returnTo: string | string[] | undefined;
  canGoBack: boolean;
  previousHref: string | null;
  goBack: () => void;
  replace: (href: Href) => void;
}): void {
  const returnPath = workspaceReturnPath(params.returnTo);
  if (
    params.canGoBack &&
    params.previousHref &&
    workspaceDestination(params.previousHref) === workspaceDestination(String(returnPath))
  ) {
    params.goBack();
    return;
  }
  params.replace(returnPath);
}
