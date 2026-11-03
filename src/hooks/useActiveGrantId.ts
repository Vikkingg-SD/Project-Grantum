import { useLocalSearchParams } from 'expo-router';

// Only the matched route supplies identity; no fixture or UI-store fallback.
export function useActiveGrantId(): string {
  const { grantID } = useLocalSearchParams<{ grantID?: string | string[] }>();
  return typeof grantID === 'string' ? grantID : '';
}
