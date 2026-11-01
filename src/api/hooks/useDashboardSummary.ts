import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { queryKeys } from '../queryKeys';

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDataSource().getDashboardSummary(),
  });
}
