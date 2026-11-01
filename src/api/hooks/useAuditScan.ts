import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { AuditScanResponse } from '@/types/api';
import { ENV } from '@/config/env';
import { queryKeys } from '../queryKeys';

export function useAuditStatus(grantId: string, isScanning = false) {
  return useQuery<AuditScanResponse | null>({
    queryKey: queryKeys.audit(grantId),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getLatestAuditScan(grantId);
    },
    enabled: Boolean(grantId),
    refetchInterval: (query) =>
      !query.state.error &&
      (query.state.data?.status === 'running' || (!query.state.data && isScanning))
        ? ENV.POLLING_INTERVAL_MS
        : false,
  });
}

export function useTriggerAuditScan(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!grantId) throw new Error('Select a grant before running an audit.');
      const ds = getDataSource();
      return ds.runAudit(grantId);
    },
    onSuccess: (scan) => {
      queryClient.setQueryData(queryKeys.audit(grantId), scan);
      void queryClient.invalidateQueries({ queryKey: queryKeys.draft(grantId) });
    },
  });
}
