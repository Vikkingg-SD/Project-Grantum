import { useMemo } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeProfileReadiness } from '@/utils/workspace';

export function useProfileReadiness() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const profileAudits = useWorkspaceStore((state) => state.profileAudits);
  return useMemo(() => {
    const project = workspace.projects.find((item) => item.id === activeProjectId);
    const revision = workspace.revisions.find((item) => item.id === project?.currentRevisionId);
    return project && revision
      ? computeProfileReadiness(project, revision, profileAudits[project.id])
      : null;
  }, [workspace, activeProjectId, profileAudits]);
}
