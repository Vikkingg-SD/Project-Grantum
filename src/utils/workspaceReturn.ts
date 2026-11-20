import type { Href } from 'expo-router';
import { isValidGrantId } from '@/utils/navigationHistory';

const STATIC_RETURN_PATHS = new Set(['/discover', '/my-works', '/project-profile', '/settings']);
const GRANT_RETURN_VIEWS = new Set([
  'dashboard',
  'discovery-studio',
  'drafting',
  'audit-studio',
  'export-humanizer',
  'post-award-tracker',
]);

// Accept only safe local user workspace destinations, never arbitrary links,
// onboarding, roadmap, or staff administration routes from query params.
export function workspaceReturnPath(value: string | string[] | undefined): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || /[?#\\]/.test(candidate)) return '/dashboard';
  if (STATIC_RETURN_PATHS.has(candidate)) return candidate as Href;
  const parts = candidate.split('/');
  if (
    parts.length === 4 &&
    parts[0] === '' &&
    parts[1] === 'grants' &&
    isValidGrantId(parts[2]) &&
    GRANT_RETURN_VIEWS.has(parts[3])
  ) {
    return candidate as Href;
  }
  return '/dashboard';
}
