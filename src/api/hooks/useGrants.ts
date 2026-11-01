import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import type { Grant } from '@/types/grant';
import type { GrantSearchParams } from '@/types/api';
import { queryKeys } from '../queryKeys';

export function useGrants(query?: string | GrantSearchParams) {
  const params = typeof query === 'string' ? { q: query } : query;
  return useQuery<Grant[]>({
    queryKey: queryKeys.grants(params),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getGrants(params);
    },
    staleTime: 1000 * 60 * 5,
  });
}
