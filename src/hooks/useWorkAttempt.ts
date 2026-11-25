import { useLocalSearchParams } from 'expo-router';
import { ENV } from '@/config/env';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { resolveWorkAttempt, workSlotKey } from '@/utils/workspace';

export function useWorkAttempt(
  grantId: string,
  options?: { attemptId: string | string[] | undefined }
) {
  const { attemptId } = useLocalSearchParams<{ attemptId?: string | string[] }>();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const projectId = useWorkspaceStore((state) => state.activeProjectId);
  const resolved = resolveWorkAttempt(
    workspace,
    projectId,
    grantId,
    options ? options.attemptId : attemptId
  );
  if (
    ENV.DATA_SOURCE === 'api' &&
    resolved.slotKey !== workSlotKey(resolved.projectId, resolved.grantId)
  ) {
    return { ...resolved, unavailable: true };
  }
  return resolved;
}
