import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { Grant } from '@/types/grant';

export function useGrantDetail(grantId: string) {
  return useQuery<Grant>({
    queryKey: ['grant', grantId],
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getGrant(grantId);
    },
    enabled: Boolean(grantId),
  });
}
