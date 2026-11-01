import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import type { GrantDetail } from '@/types/grant';
import { queryKeys } from '../queryKeys';

export function useGrantDetail(grantId: string) {
  return useQuery<GrantDetail>({
    queryKey: queryKeys.grant(grantId),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getGrant(grantId);
    },
    enabled: Boolean(grantId),
  });
}
