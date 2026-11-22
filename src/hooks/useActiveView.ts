import { useSegments } from 'expo-router';

export const VIEW_PATHS = {
  index: 'dashboard',
  discovery: 'discovery-studio',
  drafting: 'drafting',
  audit: 'audit-studio',
  export: 'export-humanizer',
  'progress-tracking': 'progress-tracking',
} as const;
export type AppView = keyof typeof VIEW_PATHS;

export function useActiveView(): AppView | undefined {
  const segments = useSegments();
  if (segments[0] !== 'grants') return undefined;
  const rawLeaf = segments[segments.length - 1];
  const leaf = rawLeaf === 'post-award-tracker' ? 'progress-tracking' : rawLeaf;
  return (Object.keys(VIEW_PATHS) as AppView[]).find((view) => VIEW_PATHS[view] === leaf);
}
