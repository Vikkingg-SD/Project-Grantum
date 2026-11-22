import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useProgressStore } from '@/store/useProgressStore';
import { styles } from './workspacePageStyles';
import { useGrants } from '@/api/hooks/useGrants';
import {
  canRolePerform,
  computeProfileReadiness,
  getProfileSyncLag,
  searchProjects,
  workSlotKey,
} from '@/utils/workspace';
import { FINISH_REVERSIBILITY_NOTE } from '@/utils/finishReview';
import { isWorkSlotReadyToFinish } from '@/utils/drafting';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';

export default function MyWorksScreen() {
  const theme = useTheme();
  const { desktop } = useLayoutMetrics();
  const router = useRouter();
  const grantsQuery = useGrants();
  const grants = useMemo(() => grantsQuery.data ?? [], [grantsQuery.data]);
  const onOpenGrantDraft = (grantId: string, projectId: string) => {
    ensureWorkSlot(projectId, grantId);
    router.navigate({ pathname: '/grants/[grantID]/drafting', params: { grantID: grantId } });
  };
  const onOpenProfile = () => router.push('/project-profile');
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const setWorkSlotReviewStatus = useWorkspaceStore((state) => state.setWorkSlotReviewStatus);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const work = useWorkbenchStore((state) => state.work);
  const recordActivity = useProgressStore((state) => state.recordActivity);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'sync-needed' | 'archived'>('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const visibleProjects = useMemo(
    () =>
      searchProjects(workspace, query, filter === 'archived').filter(
        (project) => filter !== 'archived' || Boolean(project.archivedAt)
      ),
    [filter, query, workspace]
  );

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspace.applications.filter((app) => {
      const proj = workspace.projects.find((p) => p.id === app.projectId);
      const grant = grants.find((g) => g.id === app.grantId);
      const lag = getProfileSyncLag(workspace, app.id);
      if (filter === 'archived' ? !proj?.archivedAt : Boolean(proj?.archivedAt)) return false;
      if (filter === 'sync-needed' && lag === 0) return false;
      if (filter === 'active' && app.status === 'submitted') return false;
      if (!q) return true;
      return `${proj?.name ?? ''} ${grant?.title ?? ''} ${app.grantId} ${app.status}`
        .toLowerCase()
        .includes(q);
    });
  }, [filter, grants, query, workspace]);

  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <AppText variant="h1">My Works</AppText>

        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? <AppText color="verified">{notice}</AppText> : null}

        {grantsQuery.isError && (
          <View>
            <AppText accessibilityRole="alert">
              Opportunity details could not load. Your saved work is still available.
            </AppText>
            <AppButton
              label="Retry opportunities"
              onPress={() => {
                void grantsQuery.refetch();
              }}
            />
          </View>
        )}
        <AppInput
          label="Search your work"
          placeholder="Filter by project name, grant title, or status..."
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.rowWrap}>
          {(
            [
              ['all', 'All Works'],
              ['active', 'In-Progress Drafts'],
              ['sync-needed', 'Needs Profile Sync'],
              ['archived', 'Archived Projects'],
            ] as const
          ).map(([key, label]) => (
            <AppButton
              key={key}
              size="sm"
              label={label}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </View>

        <View testID="workspace-columns" style={[styles.columns, desktop && styles.desktopColumns]}>
          <View
            testID="project-list"
            style={[
              styles.card,
              styles.sideColumn,
              desktop && styles.desktopSidebar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <AppText variant="h3">Projects ({visibleProjects.length})</AppText>
              {onOpenProfile && (
                <AppButton
                  size="sm"
                  variant="outline"
                  label="Manage projects"
                  onPress={onOpenProfile}
                />
              )}
            </View>
            {visibleProjects.length === 0 && (
              <AppText color="muted">No projects match this search.</AppText>
            )}
            {visibleProjects.map((proj) => {
              const rev = workspace.revisions.find((r) => r.id === proj.currentRevisionId);
              const readiness = rev ? computeProfileReadiness(proj, rev).score : 0;
              const isActive = proj.id === activeProjectId;
              return (
                <View key={proj.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                  <View style={styles.rowBetween}>
                    <AppText variant="body">
                      {proj.name} ({proj.kind.toUpperCase()})
                    </AppText>
                    <StatusBadge
                      label={`${readiness}% ready · ${proj.currentRevisionId}`}
                      variant={isActive ? 'verified' : 'neutral'}
                    />
                  </View>
                  <AppText variant="caption" color="muted">
                    Latest commit: {rev?.summary ?? 'Initial'}
                  </AppText>
                  <View style={styles.rowWrap}>
                    <AppButton
                      size="sm"
                      selected={isActive}
                      label={isActive ? 'Active Project Slot' : 'Set as Active Project'}
                      onPress={() => {
                        setActiveProject(proj.id);
                        setNotice(`Active Project Profile set to "${proj.name}".`);
                      }}
                    />
                    {grants[0] && (
                      <AppButton
                        size="sm"
                        variant="outline"
                        label={`Start/Open Work Slot for Grant #${grants[0].id}`}
                        onPress={() => {
                          const slot = ensureWorkSlot(proj.id, grants[0].id);
                          setActiveProject(proj.id);
                          onOpenGrantDraft?.(slot.grantId, proj.id);
                        }}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View
            testID="application-list"
            style={[
              styles.card,
              styles.mainColumn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <AppText variant="h3">Application Work Slots ({visibleApps.length})</AppText>
            {visibleApps.length === 0 && (
              <AppText color="muted">No applications match this filter.</AppText>
            )}
            {visibleApps.map((app) => {
              const proj = workspace.projects.find((p) => p.id === app.projectId);
              const grant = grants.find((g) => g.id === app.grantId);
              const lag = getProfileSyncLag(workspace, app.id);
              const slotRole = projectRoles[app.projectId] ?? 'owner';
              const canEditSlot = canRolePerform(slotRole, 'edit');
              return (
                <View key={app.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                  <View style={styles.rowBetween}>
                    <AppText variant="body">
                      {proj?.name ?? app.projectId} → {grant?.title ?? `Grant #${app.grantId}`}
                    </AppText>
                    <StatusBadge
                      label={app.status.toUpperCase()}
                      variant={
                        app.status === 'submitted' || app.status === 'ready'
                          ? 'verified'
                          : 'pending'
                      }
                    />
                  </View>
                  <View style={styles.rowWrap}>
                    {app.artifacts.map((art) => (
                      <StatusBadge
                        key={art.id}
                        label={`${art.title} (${art.revisionId})`}
                        variant="neutral"
                      />
                    ))}
                  </View>

                  {lag > 0 && (
                    <View
                      style={[
                        styles.syncAlert,
                        { backgroundColor: theme.subtle, borderColor: theme.border },
                      ]}
                    >
                      <AppText variant="caption">
                        Cross-Slot Sync Alert: Project Profile &quot;{proj?.name}&quot; is {lag}{' '}
                        commit(s) ahead (HEAD: {proj?.currentRevisionId}, Work Slot pinned to{' '}
                        {app.profileRevisionId}).
                      </AppText>
                      <AppButton
                        size="sm"
                        variant="primary"
                        label={
                          app.status === 'submitted'
                            ? 'Locked to Submission Snapshot'
                            : `Pull Latest Profile (${proj?.currentRevisionId})`
                        }
                        disabled={
                          app.status === 'submitted' || app.status === 'archived' || !canEditSlot
                        }
                        onPress={() => {
                          try {
                            pullWorkSlotProfile(app.id);
                            recordActivity(workSlotKey(app.projectId, app.grantId), {
                              actor: nickname || 'Founder Lead',
                              agent: 'system',
                              message: `Pulled latest profile revision ${proj?.currentRevisionId} from My Works`,
                            });
                            setError('');
                            setNotice(
                              `Synced work slot ${app.id} to latest profile revision ${proj?.currentRevisionId}.`
                            );
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Unable to sync profile');
                          }
                        }}
                      />
                    </View>
                  )}

                  <View style={styles.rowWrap}>
                    {onOpenGrantDraft && (
                      <AppButton
                        size="sm"
                        variant="outline"
                        label="Open in Drafting Studio"
                        onPress={() => {
                          setActiveProject(app.projectId);
                          onOpenGrantDraft(app.grantId, app.projectId);
                        }}
                      />
                    )}
                    <AppButton
                      size="sm"
                      variant="outline"
                      label="Open Progress-Tracking"
                      accessibilityLabel={`Open Progress-Tracking for ${proj?.name ?? app.projectId}`}
                      onPress={() => {
                        setActiveProject(app.projectId);
                        router.navigate({
                          pathname: '/grants/[grantID]/progress-tracking',
                          params: { grantID: app.grantId },
                        });
                      }}
                    />
                    {app.status !== 'submitted' && app.status !== 'archived' && (
                      <>
                        {app.status !== 'ready' && (
                          <AppButton
                            size="sm"
                            variant="primary"
                            label="Finish application (mark ready)"
                            accessibilityLabel={`Finish application (mark ready) for ${proj?.name ?? app.projectId}`}
                            disabled={
                              !canRolePerform(projectRoles[app.projectId] ?? 'owner', 'review') ||
                              !isWorkSlotReadyToFinish(
                                work[workSlotKey(app.projectId, app.grantId)],
                                DEFAULT_REQUIRED_SECTIONS
                              )
                            }
                            onPress={() => {
                              try {
                                setWorkSlotReviewStatus(app.id, 'ready');
                                recordActivity(workSlotKey(app.projectId, app.grantId), {
                                  actor: nickname || 'Founder Lead',
                                  agent: 'system',
                                  message: 'Marked application READY from My Works',
                                });
                                setError('');
                                setNotice(
                                  `Marked "${proj?.name ?? app.projectId}" READY. ${FINISH_REVERSIBILITY_NOTE}`
                                );
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : 'Unable to finish application'
                                );
                              }
                            }}
                          />
                        )}
                        {app.status !== 'drafting' && (
                          <AppButton
                            size="sm"
                            variant="outline"
                            label="Reopen for drafting"
                            accessibilityLabel={`Reopen for drafting for ${proj?.name ?? app.projectId}`}
                            disabled={
                              !canRolePerform(projectRoles[app.projectId] ?? 'owner', 'edit')
                            }
                            onPress={() => {
                              try {
                                setWorkSlotReviewStatus(app.id, 'drafting');
                                recordActivity(workSlotKey(app.projectId, app.grantId), {
                                  actor: nickname || 'Founder Lead',
                                  agent: 'system',
                                  status: 'running',
                                  message: 'Reopened application to DRAFTING from My Works',
                                });
                                setError('');
                                setNotice(
                                  `Reopened "${proj?.name ?? app.projectId}" to DRAFTING for further editing.`
                                );
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : 'Unable to reopen application'
                                );
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
