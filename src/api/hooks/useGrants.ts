import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoint';
import { Grant } from '@/types/grant';
import { mockGrants } from '@/mock/grants';

export function useGrants(query?: string) {
  return useQuery<Grant[]>({
    queryKey: ['grants', query],
    queryFn: async () => {
      try {
        const response = await apiClient.get(ENDPOINTS.GRANTS, { params: { q: query } });
        return response.data;
      } catch (_err) {
        // Hermetic fallback for disconnected demo runs
        if (!query) return mockGrants;
        return mockGrants.filter(
          (g) =>
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.funder.toLowerCase().includes(query.toLowerCase())
        );
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
