import type { Href } from 'expo-router';

// Accept only local workspace destinations, never arbitrary links from query params.
export function workspaceReturnPath(value: string | string[] | undefined): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate &&
    (/^\/(discover|my-works|project-profile|settings|admin)$/.test(candidate) ||
      /^\/grants\/[\w-]+\/(dashboard|discovery-studio|drafting|audit-studio|export-humanizer|post-award-tracker)$/.test(
        candidate
      ))
  )
    return candidate as Href;
  return '/dashboard';
}
