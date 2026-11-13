import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { ENV } from '@/config/env';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { reportUrgency, formatCalendarDate } from '@/utils/presentation';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { InfoCard } from '@/components/molecules/InfoCard';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useAward } from '@/api/hooks/useAward';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { ApiError } from '@/api/client';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { canRolePerform, workSlotKey } from '@/utils/workspace';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';

interface ComplianceMilestone {
  id: string;
  title: string;
  deliverable: string;
  status: 'Pending' | 'Prepared' | 'Verified';
}

const INITIAL_MILESTONES: readonly ComplianceMilestone[] = [
  {
    id: 'ms-1',
    title: '1. Financial Expenditure & Co-Funding Report',
    deliverable: 'General ledger drawdowns + utility co-funding match receipts',
    status: 'Prepared',
  },
  {
    id: 'ms-2',
    title: '2. Technical Milestone & Telemetry Deliverable',
    deliverable: 'Deployment verification log and sensor calibration annex',
    status: 'Pending',
  },
  {
    id: 'ms-3',
    title: '3. Beneficiary Impact & Audit Verification',
    deliverable: 'Quarterly service coverage metrics and signed compliance attestation',
    status: 'Pending',
  },
];

export default function PostAwardScreen() {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [tab, setTab] = useState('Details');
  const [milestones, setMilestones] = useState<ComplianceMilestone[]>(() =>
    INITIAL_MILESTONES.map((m) => ({ ...m }))
  );
  const grantId = useActiveGrantId();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const slotKey = workSlotKey(activeProjectId, grantId);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const query = useAward(grantId);
  const detail = useGrantDetail(grantId);
  const error = query.error ?? detail.error;
  const absent = error instanceof ApiError && error.status === 404;

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const canReview = canRolePerform(activeRole, 'review');

  if (!grantId || query.isPending || detail.isPending || error || !query.data || !detail.data) {
    return (
      <ScreenContainer>
        <EmptyStateLayout
          title={
            !grantId
              ? 'Select an opportunity'
              : absent
                ? 'No award yet'
                : error
                  ? 'Instrument fault'
                  : 'Calibrating instrument…'
          }
          description={
            absent
              ? 'This application has no award record.'
              : (error?.message ?? 'Open an application to view its award.')
          }
          ctaLabel={error && !absent ? 'Try again' : undefined}
          onCtaPress={() => {
            void query.refetch();
            void detail.refetch();
          }}
        />
      </ScreenContainer>
    );
  }
  const award = query.data;
  const urgency = reportUrgency(award.nextReportAt);
  const metrics = [
    { label: 'Award status', value: award.contractStatus },
    { label: 'Next report', value: formatCalendarDate(award.nextReportAt) },
    { label: 'Audit trail', value: award.events.length + ' EVENTS' },
  ];
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="h1" align="center">
          Reporting & activity
        </AppText>
        <InfoCard tone="surface">
          <AppText color="muted" align="center">
            {ENV.DATA_SOURCE === 'mock'
              ? 'Sample award record. Confirm reporting dates and submission status with your funder.'
              : 'Review your next reporting date and application history.'}
          </AppText>
        </InfoCard>
        <WorkspaceStudioBar />
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h2" align="center">
            Next reporting date
          </AppText>
          <InfoCard>
            <AppText variant="h3" align="center">
              {formatCalendarDate(award.nextReportAt, true)}
            </AppText>
          </InfoCard>
          <StatusBadge label={urgency.label} variant={urgency.variant} style={styles.centerBadge} />
          <InfoCard>
            <AppText variant="caption" color="muted" align="center">
              Report submission status is not available. Check your funder&apos;s records before
              taking action.
            </AppText>
          </InfoCard>
        </View>
        <View style={styles.heading}>
          <AppText variant="h2" align="center" style={{ flexShrink: 1 }}>
            Submission status
          </AppText>
          <StatusBadge
            label={
              award.status === 'awarded'
                ? 'Awarded'
                : award.status === 'submitted'
                  ? 'Submitted'
                  : 'In review'
            }
            variant={award.status === 'awarded' ? 'gold' : 'pending'}
          />
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h2" align="center">
            {detail.data.title}
          </AppText>
          <InfoCard>
            <AppText variant="caption" color="muted" align="center">
              {detail.data.funder +
                ' · Submitted ' +
                new Date(award.submittedAt).toLocaleDateString()}
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
          <AppText variant="h3" align="center">
            Work Slot Submission Snapshot & Deliverable Ledger
          </AppText>
          <AppText variant="caption" color="muted" align="center">
            Project Slot: {activeProject?.name ?? activeProjectId} · Pinned Profile:{' '}
            {activeApp?.submittedSnapshot?.profileRevisionId ??
              activeApp?.profileRevisionId ??
              activeProject?.currentRevisionId}
            {activeApp?.submittedSnapshot?.receiptReference
              ? ` · Receipt: ${activeApp.submittedSnapshot.receiptReference}`
              : work.submissions[0]?.receipt
                ? ` · Receipt: ${work.submissions[0].receipt}`
                : ' · No external funder receipt recorded in this slot yet'}
          </AppText>
          {milestones.map((item) => (
            <View key={item.id} style={[styles.milestoneRow, { borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <AppText variant="body">{item.title}</AppText>
                <StatusBadge
                  label={item.status.toUpperCase()}
                  variant={
                    item.status === 'Verified'
                      ? 'verified'
                      : item.status === 'Prepared'
                        ? 'pending'
                        : 'neutral'
                  }
                />
              </View>
              <AppText variant="caption" color="muted">
                {item.deliverable}
              </AppText>
              <View style={styles.heading}>
                {(['Pending', 'Prepared', 'Verified'] as const).map((status) => (
                  <AppButton
                    key={status}
                    size="sm"
                    label={status}
                    selected={item.status === status}
                    disabled={!canReview}
                    onPress={() =>
                      setMilestones((prev) =>
                        prev.map((m) => (m.id === item.id ? { ...m, status } : m))
                      )
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heading}>
            {['Notifications', 'Details', 'Recommendations'].map((label) => (
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
              <AppText align="center">
                No live notifications connected. The reporting date above comes from this award
                record.
              </AppText>
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
              {award.events.length ? (
                award.events.map((event) => <AuditLogLine key={event.id} {...event} />)
              ) : (
                <InfoCard>
                  <AppText color="muted" align="center">
                    No activity recorded.
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
  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  milestoneRow: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
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
