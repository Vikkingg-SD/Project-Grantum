import React, { useMemo, useState } from 'react';
import { useGlobalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useActiveView, VIEW_PATHS } from '@/hooks/useActiveView';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useWorkAttempt } from '@/hooks/useWorkAttempt';
import { ENV } from '@/config/env';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useGrants } from '@/api/hooks/useGrants';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  applicationOrdinal,
  canRolePerform,
  computeProfileReadiness,
  getProfileSyncLag,
} from '@/utils/workspace';
import { normalizePathname } from '@/utils/navigationHistory';

export function WorkspaceStudioBar() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const activeGrantId = useActiveGrantId();
  const { attemptId } = useGlobalSearchParams<{ attemptId?: string | string[] }>();
  const navigation = useAppNavigation(activeGrantId);
  const activeView = useActiveView();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  useEscapeDismiss(switcherOpen, () => setSwitcherOpen(false));

  const lastGrantId = useDraftStore((state) => state.lastGrantId);
  const setLastGrantId = useDraftStore((state) => state.setLastGrantId);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const defaultProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const targetGrantId =
    activeGrantId ||
    lastGrantId ||
    workspace.applications.find((app) => app.projectId === defaultProjectId)?.grantId ||
    '1';
  const context = useWorkAttempt(activeGrantId || (attemptId === undefined ? targetGrantId : ''), {
    attemptId,
  });
  const activeProjectId = context.projectId;
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const profileAudits = useWorkspaceStore((state) => state.profileAudits);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const createWorkAttempt = useWorkspaceStore((state) => state.createWorkAttempt);
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

  const effectiveRole = projectRoles[activeProjectId] ?? 'owner';
  const canEdit = canRolePerform(effectiveRole, 'edit');

  const { application, grantId: selectedGrantId, slotKey } = context;
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
    const grants = new Map(catalog.map((grant) => [grant.id, grant.title]));
    for (const app of projectApps) {
      if (!grants.has(app.grantId)) grants.set(app.grantId, 'Opportunity #' + app.grantId);
    }
    return Array.from(grants).flatMap<{
      grantId: string;
      title: string;
      statusLabel: string;
      attemptId?: string;
    }>(([grantId, title]) => {
      const attempts = projectApps.filter((app) => app.grantId === grantId);
      if (!attempts.length) return [{ grantId, title, statusLabel: 'new', attemptId: undefined }];
      return attempts
        .filter((app, index) => ENV.DATA_SOURCE === 'mock' || index === 0)
        .map((app) => ({
          grantId,
          title:
            attempts.length > 1
              ? title + ' · Attempt ' + applicationOrdinal(workspace, app)
              : title,
          statusLabel: app.status,
          attemptId: app.id,
        }));
    });
  }, [activeProjectId, grantsQuery.data, workspace]);

  const handleSelectGrant = (nextGrantId: string, nextAttemptId?: string) => {
    const nextId =
      nextAttemptId ?? (canEdit ? ensureWorkSlot(activeProjectId, nextGrantId).id : undefined);
    setLastGrantId(nextGrantId);
    setSwitcherOpen(false);
    if (pathname === '/form-templates') {
      if (nextId !== attemptId) {
        router.push({
          pathname: '/form-templates',
          params: nextId ? { attemptId: nextId } : {},
        });
      }
      return;
    }
    navigation.navigateTo(
      activeView ?? (pathname === '/discover' ? 'discovery' : 'index'),
      nextGrantId,
      nextId
    );
  };

  const canStartAnother = Boolean(
    ENV.DATA_SOURCE === 'mock' &&
    canEdit &&
    activeProject &&
    !activeProject.archivedAt &&
    application &&
    selectedGrantId
  );

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
                      activeGrantId || (pathname === '/form-templates' ? selectedGrantId : '');
                    const existing = workspace.applications.find(
                      (app) => app.projectId === proj.id && app.grantId === contextGrantId
                    );
                    const nextRole = projectRoles[proj.id] ?? 'owner';
                    const next =
                      existing ??
                      (contextGrantId && canRolePerform(nextRole, 'edit')
                        ? ensureWorkSlot(proj.id, contextGrantId)
                        : undefined);
                    setActiveProject(proj.id);
                    if (pathname === '/form-templates') {
                      if (next || attemptId !== undefined) {
                        router.push({
                          pathname: '/form-templates',
                          params: next ? { attemptId: next.id } : {},
                        });
                      }
                    } else if (activeView && contextGrantId && (next || attemptId !== undefined)) {
                      router.push({
                        pathname: '/grants/[grantID]/' + VIEW_PATHS[activeView],
                        params: { grantID: contextGrantId, attemptId: next?.id },
                      } as Href);
                    }
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
            {canStartAnother && (
              <AppButton
                size="sm"
                variant="outline"
                label="Start another attempt"
                onPress={() => {
                  const next = createWorkAttempt(activeProjectId, selectedGrantId);
                  handleSelectGrant(next.grantId, next.id);
                }}
              />
            )}
            {projectApplicationOptions.map((option) => (
              <AppButton
                key={option.attemptId ?? option.grantId}
                size="sm"
                variant="outline"
                selected={
                  option.grantId === selectedGrantId && option.attemptId === application?.id
                }
                label={`${option.title} (${option.statusLabel})`}
                accessibilityLabel={`Switch application: ${option.title} (${option.statusLabel})`}
                onPress={() => handleSelectGrant(option.grantId, option.attemptId)}
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
