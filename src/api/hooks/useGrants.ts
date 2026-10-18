import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { Grant } from '@/types/grant';

export function useGrants(query?: string) {
  return useQuery<Grant[]>({
    queryKey: ['grants', query],
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getGrants({ q: query });
    },
    staleTime: 1000 * 60 * 5,
  });
}
