import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { AuditScanResponse } from '@/types/api';
import { ENV } from '@/config/env';
import { useDraftStore } from '@/store/useDraftStore';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { useProgressStore } from '@/store/useProgressStore';
import { recordAuditHistoryEntry } from '@/utils/drafting';
import { queryKeys } from '../queryKeys';

export interface AuditTriggerInput {
  snapshotSignature?: string;
  allComplete?: boolean;
  incompleteSectionTitles?: readonly string[];
  confidenceScore?: number;
  profileRevisionId?: string;
  sectionVersionId?: string | null;
  actor?: string;
}

export function auditPollingInterval(
  data: AuditScanResponse | null | undefined,
  hasError: boolean,
  isScanning = false
): number | false {
  return !hasError && (data?.status === 'running' || (!data && isScanning))
    ? ENV.POLLING_INTERVAL_MS
    : false;
}

export function useAuditStatus(grantId: string, isScanning = false, slotKey?: string) {
  return useQuery<AuditScanResponse | null>({
    queryKey: queryKeys.audit(grantId, slotKey),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getLatestAuditScan(grantId);
    },
    enabled: Boolean(grantId),
    refetchInterval: (query) =>
      auditPollingInterval(query.state.data, Boolean(query.state.error), isScanning),
  });
}

export function useTriggerAuditScan(grantId: string, slotKey?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_input?: AuditTriggerInput | void) => {
      if (!grantId) throw new Error('Select a grant before running an audit.');
      const ds = getDataSource();
      const initial = await ds.runAudit(grantId);
      if (ENV.DATA_SOURCE === 'mock' && initial.status === 'running') {
        return (await ds.getLatestAuditScan(grantId)) ?? initial;
      }
      return initial;
    },
    onSuccess: (scan, input) => {
      queryClient.setQueryData(queryKeys.audit(grantId, slotKey), scan);
      void queryClient.invalidateQueries({ queryKey: queryKeys.draft(grantId) });
      if (slotKey && input && scan.status !== 'running') {
        const missing =
          ENV.DATA_SOURCE === 'mock'
            ? [...new Set(input.incompleteSectionTitles ?? [])]
            : [...new Set([...scan.missingSections, ...(input.incompleteSectionTitles ?? [])])];
        const passed =
          Boolean(input.allComplete) &&
          missing.length === 0 &&
          (ENV.DATA_SOURCE === 'mock' || scan.status !== 'failed');
        if (passed && input.snapshotSignature) {
          useDraftStore.getState().recordAuditSnapshot(slotKey, input.snapshotSignature);
        }
        useWorkbenchStore.getState().update(slotKey, (current) =>
          recordAuditHistoryEntry(current, {
            id: scan.scanId,
            timestamp: scan.events[0]?.timestamp ?? new Date().toISOString(),
            status: passed ? 'passed' : 'failed',
            confidenceScore: input.confidenceScore ?? scan.confidenceScore,
            missingSections: missing,
            signature: input.snapshotSignature ?? '',
            profileRevisionId: input.profileRevisionId ?? 'latest',
            sectionVersionId: input.sectionVersionId,
          })
        );
        const resolvedScore = input.confidenceScore ?? scan.confidenceScore;
        useProgressStore.getState().recordActivity(slotKey, {
          actor: input.actor || 'Founder Lead',
          agent: 'agent-2-deterministic',
          status: passed ? 'passed' : 'failed',
          message: `Ran application audit (${resolvedScore}% · ${
            passed ? 'Checklist check passed' : 'Action required'
          })`,
        });
      }
    },
  });
}
