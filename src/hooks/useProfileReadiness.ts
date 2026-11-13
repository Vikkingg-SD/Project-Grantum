import { useMemo } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeProfileReadiness } from '@/utils/workspace';

export function useProfileReadiness() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  return useMemo(() => {
    const project = workspace.projects.find((item) => item.id === activeProjectId);
    const revision = workspace.revisions.find((item) => item.id === project?.currentRevisionId);
    return project && revision ? computeProfileReadiness(project, revision) : null;
  }, [workspace, activeProjectId]);
}
