import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { ENV } from '@/config/env';
import { RADIUS, SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { MOCK_AWARD_APPLICATION_ID } from '@/mock/seeds';
import { useWorkAttempt } from '@/hooks/useWorkAttempt';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useApplicationAuditState } from '@/hooks/useApplicationAuditState';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { InfoCard } from '@/components/molecules/InfoCard';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useAward } from '@/api/hooks/useAward';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus } from '@/api/hooks/useAuditScan';
import { ApiError } from '@/api/client';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { hydrateBudget, useBudgetStore } from '@/store/useBudgetStore';
import { hydrateProgress, useProgressStore } from '@/store/useProgressStore';
import { buildDefaultBudgetRecord, evaluateWorkSlotBudget } from '@/utils/budget';
import { resolveApplicationNarrative } from '@/utils/drafting';
import { formatEventDate } from '@/utils/presentation';
import {
  buildStageWorkplan,
  canRoleMarkWorkplanDone,
  createEmptyProgressRecord,
  deriveApplicationProgress,
  type DerivedWorkplanItem,
} from '@/utils/progressTracking';
import type { CoWorkRole } from '@/types/workspace';
import { posthog } from '@/config/posthog';

export default function ProgressTrackingScreen() {
  const grantId = useActiveGrantId();
  const { slotKey } = useWorkAttempt(grantId);
  return <ProgressTrackingSession key={slotKey} grantId={grantId} slotKey={slotKey} />;
}

function ProgressTrackingSession({ grantId, slotKey }: { grantId: string; slotKey: string }) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const navigation = useAppNavigation();
  const [tab, setTab] = useState<'Notifications' | 'Details' | 'Recommendations'>('Details');
  const [nowMs] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const workspace = useWorkspaceStore((state) => state.workspace);
  const { projectId: activeProjectId, application: activeApp } = useWorkAttempt(grantId);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const effectiveRole: CoWorkRole = projectRoles[activeProjectId] ?? 'owner';
  const canEditRole = effectiveRole !== 'viewer';
  const canMarkDone = canRoleMarkWorkplanDone(effectiveRole);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const isSubmittedSlot = Boolean(
    activeApp && (activeApp.status === 'submitted' || activeApp.submittedSnapshot !== null)
  );

  const detail = useGrantDetail(grantId);
  const draft = useProposalDraft(grantId, slotKey);
  const scan = useAuditStatus(grantId, false, slotKey);
  const canLoadAward =
    ENV.DATA_SOURCE !== 'mock' || (isSubmittedSlot && activeApp?.id === MOCK_AWARD_APPLICATION_ID);
  const awardQuery = useAward(canLoadAward ? grantId : '');

  const local = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const budgetRecords = useBudgetStore((state) => state.records);
  const progressRecords = useProgressStore((state) => state.records);
  const verifyTask = useProgressStore((state) => state.verifyTask);
  const markTaskDone = useProgressStore((state) => state.markTaskDone);
  const reopenTask = useProgressStore((state) => state.reopenTask);

  useEffect(() => {
    void hydrateBudget();
    void hydrateProgress();
  }, []);

  const progressRecord = useMemo(
    () => progressRecords[slotKey] ?? createEmptyProgressRecord(slotKey),
    [progressRecords, slotKey]
  );

  const budgetSavedForSlot = Boolean(budgetRecords[slotKey]);
  const budgetEvaluation = useMemo(
    () => evaluateWorkSlotBudget(budgetRecords[slotKey] ?? buildDefaultBudgetRecord(slotKey)),
    [budgetRecords, slotKey]
  );

  const resolvedNarrative = resolveApplicationNarrative(
    local.exportDocument,
    work,
    draft.data?.body
  );
  const auditState = useApplicationAuditState({
    requiredSections: draft.data?.requiredSections,
    completedSections: draft.data?.completedSections,
    work,
    exportBody: resolvedNarrative,
    contentRevision: local.contentRevision,
    auditedSignature: local.auditedSignature,
    profileRevisionId: activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest',
    scanStatus: scan.data?.status,
    running: ENV.DATA_SOURCE !== 'mock' && scan.data?.status === 'running',
  });

  const detailAbsent = detail.error instanceof ApiError && detail.error.status === 404;

  const awardRecord = isSubmittedSlot && canLoadAward ? awardQuery.data : undefined;

  const derived = useMemo(() => {
    if (!detail.data) return null;
    return deriveApplicationProgress({
      grant: detail.data,
      application: activeApp,
      awardRecord,
      nowMs,
    });
  }, [activeApp, awardRecord, detail.data, nowMs]);

  const workplanItems = useMemo(() => {
    if (!derived) return [];
    return buildStageWorkplan({
      stage: derived.stage,
      record: progressRecord,
      filledSectionsCount: auditState.filledSections.length,
      totalSectionsCount: auditState.sectionItems.length,
      missingSectionTitles: auditState.incompleteSections.map((item) => item.title),
      budgetSavedForSlot,
      budgetEvaluation,
      auditPassed: auditState.passed,
      auditStale: auditState.auditStale,
      auditHistoryCount: auditState.auditHistory.length,
      exportNarrativeFilled: resolvedNarrative.trim().length > 0,
      nextReportDateDisplay:
        derived.stage === 'accepted' ? derived.nextDeadlineCardValue : undefined,
    });
  }, [
    auditState.auditHistory.length,
    auditState.auditStale,
    auditState.filledSections.length,
    auditState.incompleteSections,
    auditState.passed,
    auditState.sectionItems.length,
    budgetEvaluation,
    budgetSavedForSlot,
    derived,
    progressRecord,
    resolvedNarrative,
  ]);

  if (!grantId || detail.isPending || detail.error || !detail.data || !derived) {
    return (
      <ScreenContainer>
        <EmptyStateLayout
          title={
            !grantId
              ? 'Select an opportunity'
              : detailAbsent
                ? 'Opportunity unavailable'
                : detail.error
                  ? 'Instrument fault'
                  : 'Calibrating instrument…'
          }
          description={detail.error?.message ?? 'Open an application to track its progress.'}
          ctaLabel={detail.error && !detailAbsent ? 'Try again' : undefined}
          onCtaPress={() => {
            void detail.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  const activityEvents = progressRecord.activityLog;
  const metrics = [
    { label: 'Award status', value: derived.awardStatusValue },
    { label: derived.nextDeadlineCardLabel, value: derived.nextDeadlineCardValue },
    {
      label: 'Activity trail',
      value: `${activityEvents.length} ${activityEvents.length === 1 ? 'EVENT' : 'EVENTS'}`,
    },
  ];

  const handleContinueTask = (task: DerivedWorkplanItem) => {
    setErrorMsg('');
    setNotice('');
    navigation.navigateTo(task.targetTab, grantId);
  };

  const handleVerifyTask = (task: DerivedWorkplanItem) => {
    try {
      verifyTask(slotKey, {
        taskId: task.id,
        taskTitle: task.title,
        autoCompletionPct: task.autoCompletionPct,
        actor: nickname || 'Founder Lead',
        role: effectiveRole,
      });
      setErrorMsg('');
      setNotice(`Verified confirmation for "${task.title}".`);
    } catch (e) {
      setNotice('');
      setErrorMsg(e instanceof Error ? e.message : 'Unable to verify workplan item.');
    }
  };

  const handleMarkDone = (task: DerivedWorkplanItem) => {
    try {
      markTaskDone(slotKey, {
        taskId: task.id,
        taskTitle: task.title,
        autoCompletionPct: task.autoCompletionPct,
        actor: nickname || 'Founder Lead',
        role: effectiveRole,
      });
      setErrorMsg('');
      posthog?.capture('workplan_task_completed', {
        task_id: task.id,
        application_stage: derived.stage,
        completion_method: 'manual',
      });
      setNotice(`Marked "${task.title}" done (${effectiveRole}).`);
    } catch (e) {
      setNotice('');
      setErrorMsg(e instanceof Error ? e.message : 'Unable to mark workplan item done.');
    }
  };

  const handleReopenTask = (task: DerivedWorkplanItem) => {
    try {
      reopenTask(slotKey, {
        taskId: task.id,
        taskTitle: task.title,
        actor: nickname || 'Founder Lead',
        role: effectiveRole,
      });
      setErrorMsg('');
      setNotice(`Reopened "${task.title}".`);
    } catch (e) {
      setNotice('');
      setErrorMsg(e instanceof Error ? e.message : 'Unable to reopen workplan item.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="h1" align="center">
          Progress-Tracking
        </AppText>
        <WorkspaceStudioBar />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h2" align="center">
            {derived.deadlineHeading}
          </AppText>
          <InfoCard>
            <AppText variant="h3" align="center">
              {derived.deadlinePrimaryValue}
            </AppText>
          </InfoCard>
          <StatusBadge
            label={derived.deadlineBadgeLabel}
            variant={derived.deadlineBadgeVariant}
            style={styles.centerBadge}
          />
        </View>

        <View style={styles.heading}>
          <AppText variant="h2" align="center" style={{ flexShrink: 1 }}>
            Submission status
          </AppText>
          <StatusBadge
            testID="submission-status-badge"
            label={derived.submissionStatusLabel}
            variant={derived.submissionStatusVariant}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h2" align="center">
            {detail.data.title}
          </AppText>
          <InfoCard>
            <AppText variant="caption" color="muted" align="center">
              {derived.headerSubtitle}
            </AppText>
          </InfoCard>
          <InfoCard>
            <AppText variant="caption" color="muted" align="center">
              Opportunity funding range
            </AppText>
            <AppText variant="metric-lg" align="center">
              {detail.data.amount}
            </AppText>
          </InfoCard>
          <View style={[styles.metrics, mobile && styles.stacked]}>
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={[
                  styles.metric,
                  mobile && { flexBasis: 'auto' },
                  { backgroundColor: theme.subtle },
                ]}
              >
                <AppText variant="caption" color="muted" align="center">
                  {metric.label}
                </AppText>
                <AppText variant="metric-sm" align="center">
                  {metric.value}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">Stage workplan</AppText>
            <StatusBadge
              label={derived.stage.toUpperCase()}
              variant={derived.submissionStatusVariant}
            />
          </View>
          <AppText variant="caption" color="muted">
            {derived.keyDatesSummary}
          </AppText>
          <AppText variant="caption" color="muted">
            {derived.stageSummary}
          </AppText>
          {errorMsg ? (
            <AppText color="failureText" accessibilityRole="alert">
              {errorMsg}
            </AppText>
          ) : null}
          {notice ? (
            <AppText color="verified" accessibilityLiveRegion="polite">
              {notice}
            </AppText>
          ) : null}
          {!canMarkDone ? (
            <AppText variant="caption" color="muted">
              Role: {effectiveRole.toUpperCase()} · Owner or Reviewer role required to mark
              incomplete tasks done.
            </AppText>
          ) : null}

          {!derived.showWorkplan || workplanItems.length === 0 ? (
            <InfoCard>
              <AppText color="muted" align="center">
                No active workplan tasks for this application stage.
              </AppText>
            </InfoCard>
          ) : (
            workplanItems.map((task) => {
              const isDone = task.status === 'verified' || task.status === 'marked-done';
              const badgeLabel =
                task.status === 'marked-done'
                  ? 'DONE (OVERRIDE)'
                  : task.status === 'verified'
                    ? 'VERIFIED 100%'
                    : `${task.autoCompletionPct}% complete`;
              const badgeVariant = isDone
                ? 'verified'
                : task.autoCompletionPct > 0
                  ? 'pending'
                  : 'neutral';
              return (
                <View
                  key={task.id}
                  testID={`workplan-task-${task.id}`}
                  style={[styles.taskRow, { borderTopColor: theme.border }]}
                >
                  <View style={styles.rowBetween}>
                    <AppText variant="body" style={styles.flexible}>
                      {task.title}
                    </AppText>
                    <StatusBadge label={badgeLabel} variant={badgeVariant} />
                  </View>
                  <AppText variant="caption" color="muted">
                    {task.detail}
                  </AppText>
                  {isDone && task.override ? (
                    <AppText variant="caption" color="verified">
                      Confirmed by {task.override.updatedBy} ({task.override.updatedByRole}) ·{' '}
                      {formatEventDate(task.override.updatedAt)}
                    </AppText>
                  ) : null}
                  <View style={styles.actionsRow}>
                    <AppButton
                      size="sm"
                      variant="outline"
                      label="Continue work"
                      accessibilityLabel={`Continue work: ${task.title}`}
                      onPress={() => handleContinueTask(task)}
                    />
                    {!isDone ? (
                      <>
                        <AppButton
                          size="sm"
                          variant="outline"
                          label="Verify confirmation"
                          accessibilityLabel={`Verify confirmation: ${task.title}`}
                          disabled={!canEditRole}
                          onPress={() => handleVerifyTask(task)}
                        />
                        <AppButton
                          size="sm"
                          variant="primary"
                          label="Mark done"
                          accessibilityLabel={`Mark done: ${task.title}`}
                          disabled={!canMarkDone}
                          onPress={() => handleMarkDone(task)}
                        />
                      </>
                    ) : (
                      <AppButton
                        size="sm"
                        variant="ghost"
                        label="Reopen"
                        accessibilityLabel={`Reopen: ${task.title}`}
                        disabled={!canEditRole}
                        onPress={() => handleReopenTask(task)}
                      />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heading}>
            {(['Notifications', 'Details', 'Recommendations'] as const).map((label) => (
              <AppButton
                key={label}
                label={label}
                size="sm"
                variant={tab === label ? 'outline' : 'ghost'}
                selected={tab === label}
                onPress={() => setTab(label)}
              />
            ))}
          </View>
          {tab === 'Notifications' ? (
            <InfoCard>
              <AppText align="center">{derived.notificationsEmptyText}</AppText>
            </InfoCard>
          ) : tab === 'Recommendations' ? (
            <InfoCard>
              <AppText align="center">No recommendations available for this application.</AppText>
            </InfoCard>
          ) : (
            <View style={styles.content}>
              <AppText variant="h3" align="center">
                Activity history
              </AppText>
              {activityEvents.length > 0 ? (
                activityEvents.map((event) => (
                  <AuditLogLine
                    key={event.id}
                    agent={event.agent}
                    message={`${event.message} · ${event.actor}`}
                    status={event.status}
                    timestamp={event.timestamp}
                  />
                ))
              ) : (
                <InfoCard>
                  <AppText color="muted" align="center">
                    No activity recorded for this application yet.
                  </AppText>
                </InfoCard>
              )}
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  centerBadge: { alignSelf: 'center' },
  flexible: { flexShrink: 1, minWidth: 0 },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  taskRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  metrics: { flexDirection: 'row', gap: SPACING.sm },
  stacked: { flexDirection: 'column' },
  metric: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
});
