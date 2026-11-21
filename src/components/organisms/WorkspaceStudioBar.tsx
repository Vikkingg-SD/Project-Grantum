import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeProfileReadiness, getProfileSyncLag, workSlotKey } from '@/utils/workspace';
import { normalizePathname } from '@/utils/navigationHistory';

export function WorkspaceStudioBar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const activeGrantId = useActiveGrantId();
  const lastGrantId = useDraftStore((state) => state.lastGrantId);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);
  const readiness = useMemo(
    () =>
      activeProject && activeRevision
        ? computeProfileReadiness(activeProject, activeRevision)
        : null,
    [activeProject, activeRevision]
  );

  const targetGrantId =
    activeGrantId ||
    lastGrantId ||
    workspace.applications.find((app) => app.projectId === activeProjectId)?.grantId ||
    '1';
  const slotKey = workSlotKey(activeProjectId, targetGrantId);
  const localDraft = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);

  const isScanned = Boolean(
    localDraft.auditedSignature ||
    work.auditedSignature ||
    (work.auditHistory && work.auditHistory.length > 0)
  );

  const badgeLabel =
    persistenceStatus === 'saving' ? 'Saving…' : isScanned ? 'Saved' : 'In Drafting';
  const badgeVariant =
    persistenceStatus === 'saving' ? 'pending' : isScanned ? 'verified' : 'brand';

  const outOfSyncCount = useMemo(
    () => workspace.applications.filter((app) => getProfileSyncLag(workspace, app.id) > 0).length,
    [workspace]
  );
  return (
    <>
      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppButton
          size="sm"
          variant="outline"
          label={`Project: ${activeProject?.name ?? 'Default'} (${readiness?.score ?? 0}% ready)`}
          onPress={() => {
            if (pathname !== '/project-profile') router.push('/project-profile');
          }}
        />
        <AppButton
          size="sm"
          variant="outline"
          label={`My Works (${workspace.applications.length}${outOfSyncCount ? ` · ${outOfSyncCount} sync` : ''})`}
          onPress={() => {
            if (pathname !== '/my-works') router.push('/my-works');
          }}
        />
        <StatusBadge
          testID="workspace-studio-status-badge"
          label={badgeLabel}
          variant={badgeVariant}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
});
