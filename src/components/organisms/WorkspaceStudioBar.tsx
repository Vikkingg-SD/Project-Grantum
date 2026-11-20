import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeProfileReadiness, getProfileSyncLag } from '@/utils/workspace';
import { normalizePathname } from '@/utils/navigationHistory';

export function WorkspaceStudioBar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
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
          label={
            persistenceStatus === 'device-saved'
              ? 'Saved'
              : persistenceStatus === 'saving'
                ? 'Saving…'
                : 'Session only'
          }
          variant={persistenceStatus === 'device-saved' ? 'verified' : 'neutral'}
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
