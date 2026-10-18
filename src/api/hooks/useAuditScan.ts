import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { AuditScanResponse } from '@/types/api';
import { ENV } from '@/config/env';

export function useAuditStatus(grantId: string, isScanning: boolean) {
  return useQuery<AuditScanResponse | null>({
    queryKey: ['audit-status', grantId],
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getLatestAuditScan(grantId);
    },
    enabled: Boolean(grantId),
    refetchInterval: isScanning ? ENV.POLLING_INTERVAL_MS : false,
  });
}

export function useTriggerAuditScan(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ds = getDataSource();
      return ds.runAudit(grantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-status', grantId] });
    },
  });
}
