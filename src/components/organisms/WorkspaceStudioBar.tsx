import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useActiveView, VIEW_PATHS } from '@/hooks/useActiveView';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useGrants } from '@/api/hooks/useGrants';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  canRolePerform,
  computeProfileReadiness,
  getProfileSyncLag,
  workSlotKey,
} from '@/utils/workspace';
import { normalizePathname } from '@/utils/navigationHistory';

export function WorkspaceStudioBar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const activeGrantId = useActiveGrantId();
  const activeView = useActiveView();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  useEscapeDismiss(switcherOpen, () => setSwitcherOpen(false));

  const lastGrantId = useDraftStore((state) => state.lastGrantId);
  const setLastGrantId = useDraftStore((state) => state.setLastGrantId);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const profileAudits = useWorkspaceStore((state) => state.profileAudits);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const grantsQuery = useGrants();

  const activeProjects = useMemo(
    () => workspace.projects.filter((project) => !project.archivedAt),
    [workspace.projects]
  );
  const activeProject =
    activeProjects.find((p) => p.id === activeProjectId) ??
    workspace.projects.find((p) => p.id === activeProjectId) ??
    workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);
  const readiness = useMemo(
    () =>
      activeProject && activeRevision
        ? computeProfileReadiness(activeProject, activeRevision, profileAudits[activeProject.id])
        : null,
    [activeProject, activeRevision, profileAudits]
  );

  const effectiveRole = projectRoles[activeProjectId] ?? activeRole;
  const canEdit = canRolePerform(effectiveRole, 'edit');

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

  const projectApplicationOptions = useMemo(() => {
    const catalog = grantsQuery.data ?? [];
    const projectApps = workspace.applications.filter((app) => app.projectId === activeProjectId);
    const seenIds = new Set<string>();
    const options: { grantId: string; title: string; statusLabel: string }[] = [];

    for (const grant of catalog) {
      seenIds.add(grant.id);
      const app = projectApps.find((item) => item.grantId === grant.id);
      options.push({
        grantId: grant.id,
        title: grant.title,
        statusLabel: app ? app.status : 'new',
      });
    }
    for (const app of projectApps) {
      if (seenIds.has(app.grantId)) continue;
      seenIds.add(app.grantId);
      options.push({
        grantId: app.grantId,
        title: `Opportunity #${app.grantId}`,
        statusLabel: app.status,
      });
    }
    return options;
  }, [activeProjectId, grantsQuery.data, workspace.applications]);

  const handleSelectGrant = (nextGrantId: string) => {
    const exists = workspace.applications.some(
      (app) => app.projectId === activeProjectId && app.grantId === nextGrantId
    );
    if (!exists && canEdit) {
      ensureWorkSlot(activeProjectId, nextGrantId);
    }
    setLastGrantId(nextGrantId);
    setSwitcherOpen(false);
    if (pathname === '/form-templates') {
      return;
    }
    if (activeView) {
      if (nextGrantId !== activeGrantId) {
        router.navigate({
          pathname: `/grants/[grantID]/${VIEW_PATHS[activeView]}` as const,
          params: { grantID: nextGrantId },
        });
      }
      return;
    }
    if (pathname === '/discover') {
      router.navigate({
        pathname: '/grants/[grantID]/discovery-studio',
        params: { grantID: nextGrantId },
      });
      return;
    }
    router.navigate({
      pathname: '/grants/[grantID]/dashboard',
      params: { grantID: nextGrantId },
    });
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.topRow}>
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
        <AppButton
          size="sm"
          variant="outline"
          label="Switch project / application"
          expanded={switcherOpen}
          onPress={() => setSwitcherOpen((open) => !open)}
        />
        <StatusBadge
          testID="workspace-studio-status-badge"
          label={badgeLabel}
          variant={badgeVariant}
        />
      </View>

      {switcherOpen && (
        <View
          testID="workspace-context-switcher-panel"
          style={[styles.switcherPanel, { borderTopColor: theme.border }]}
        >
          <AppText variant="label">Project profiles</AppText>
          <View style={styles.chipsRow}>
            {activeProjects.map((proj) => (
              <AppButton
                key={proj.id}
                size="sm"
                variant="outline"
                selected={proj.id === activeProjectId}
                label={proj.name}
                accessibilityLabel={`Switch project: ${proj.name}`}
                onPress={() => {
                  if (proj.id !== activeProjectId) {
                    const contextGrantId =
                      activeGrantId || (pathname === '/form-templates' ? targetGrantId : '');
                    if (contextGrantId) {
                      const hasSlot = workspace.applications.some(
                        (app) => app.projectId === proj.id && app.grantId === contextGrantId
                      );
                      const nextRole = projectRoles[proj.id] ?? activeRole;
                      if (!hasSlot && canRolePerform(nextRole, 'edit')) {
                        ensureWorkSlot(proj.id, contextGrantId);
                      }
                    }
                    setActiveProject(proj.id);
                  }
                  setSwitcherOpen(false);
                }}
              />
            ))}
          </View>

          <AppText variant="label">
            Applications for {activeProject?.name ?? 'active project'}
          </AppText>
          <View style={styles.chipsRow}>
            {projectApplicationOptions.map((option) => (
              <AppButton
                key={option.grantId}
                size="sm"
                variant="outline"
                selected={option.grantId === targetGrantId}
                label={`${option.title} (${option.statusLabel})`}
                accessibilityLabel={`Switch application: ${option.title} (${option.statusLabel})`}
                onPress={() => handleSelectGrant(option.grantId)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'column',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  switcherPanel: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
