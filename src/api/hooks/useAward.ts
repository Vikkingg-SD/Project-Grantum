import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { queryKeys } from '../queryKeys';

export function useAward(grantId: string) {
  return useQuery({
    queryKey: queryKeys.award(grantId),
    queryFn: () => getDataSource().getAward(grantId),
    enabled: Boolean(grantId),
  });
}
