import { useLocalSearchParams } from 'expo-router';
import { isValidGrantId } from '@/utils/navigationHistory';

// Only a single valid matched route parameter supplies identity; reject array collisions
// and dot-segment/control-character traversal payloads.
export function useActiveGrantId(): string {
  const { grantID } = useLocalSearchParams<{ grantID?: string | string[] }>();
  if (typeof grantID !== 'string') return '';
  return isValidGrantId(grantID) ? grantID : '';
}
