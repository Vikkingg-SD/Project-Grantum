import { useSegments } from 'expo-router';

export const VIEW_PATHS = {
  index: 'dashboard',
  discovery: 'discovery-studio',
  drafting: 'drafting',
  audit: 'audit-studio',
  export: 'export-humanizer',
  'post-award': 'post-award-tracker',
} as const;
export type AppView = keyof typeof VIEW_PATHS;

export function useActiveView(): AppView | undefined {
  const segments = useSegments();
  const leaf = segments[segments.length - 1];
  return (Object.keys(VIEW_PATHS) as AppView[]).find((view) => VIEW_PATHS[view] === leaf);
}
