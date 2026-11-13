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
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { styles } from './workspacePageStyles';
import { useGrants } from '@/api/hooks/useGrants';
import { useDraftStore } from '@/store/useDraftStore';
import { computeProfileReadiness, getProfileSyncLag, searchProjects } from '@/utils/workspace';

export default function MyWorksScreen() {
  const theme = useTheme();
  const { desktop } = useLayoutMetrics();
  const router = useRouter();
  const grantsQuery = useGrants();
  const grants = useMemo(() => grantsQuery.data ?? [], [grantsQuery.data]);
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const onOpenGrantDraft = (grantId: string, projectId: string) => {
    ensureDraft(grantId);
    ensureWorkSlot(projectId, grantId);
    router.navigate({ pathname: '/grants/[grantID]/drafting', params: { grantID: grantId } });
  };
  const onOpenProfile = () => router.push('/project-profile');
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);

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
        <AppText color="muted">
          Find your projects, resume applications and review profile updates.
        </AppText>

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
              return (
                <View key={app.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                  <View style={styles.rowBetween}>
                    <AppText variant="body">
                      {proj?.name ?? app.projectId} → {grant?.title ?? `Grant #${app.grantId}`}
                    </AppText>
                    <StatusBadge
                      label={app.status.toUpperCase()}
                      variant={app.status === 'submitted' ? 'verified' : 'pending'}
                    />
                  </View>
                  <AppText variant="caption" color="muted">
                    Slot ID: {app.id} · Pinned Profile: {app.profileRevisionId} · Updated:{' '}
                    {app.updatedAt.slice(0, 16).replace('T', ' ')}
                  </AppText>
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
                        disabled={app.status === 'submitted'}
                        onPress={() => {
                          try {
                            pullWorkSlotProfile(app.id);
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
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
