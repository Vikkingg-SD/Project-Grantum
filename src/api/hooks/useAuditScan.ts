import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoint';
import { AuditScanResponse } from '@/types/api';
import { ENV } from '@/config/env';

export function useAuditStatus(grantId: string, isScanning: boolean) {
  return useQuery<AuditScanResponse>({
    queryKey: ['audit-status', grantId],
    queryFn: async () => {
      const response = await apiClient.get(ENDPOINTS.PROPOSAL_AUDIT(grantId));
      return response.data;
    },
    enabled: Boolean(grantId),
    refetchInterval: isScanning ? ENV.POLLING_INTERVAL_MS : false,
  });
}

export function useTriggerAuditScan(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(ENDPOINTS.PROPOSAL_AUDIT(grantId), {
        triggerMode: 'full_scan',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-status', grantId] });
    },
  });
}
