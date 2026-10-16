import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoint';
import { Grant } from '@/types/grant';
import { mockGrants } from '@/mock/grants';

export function useGrantDetail(grantId: string) {
  return useQuery<Grant>({
    queryKey: ['grant', grantId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(ENDPOINTS.GRANT_DETAIL(grantId));
        return response.data;
      } catch (_err) {
        return mockGrants.find((g) => g.id === grantId) ?? mockGrants[0];
      }
    },
    enabled: Boolean(grantId),
  });
}
