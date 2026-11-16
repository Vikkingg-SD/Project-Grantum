import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Grant } from '@/types/grant';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  hydrateEligibilityPreflight,
  useEligibilityPreflightStore,
} from '@/store/useEligibilityPreflightStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { MODAL_COPY } from '@/config/copy';
import { ENV } from '@/config/env';
import { buildDefaultPreflight, summarizePreflight } from '@/utils/eligibilityPreflight';
import { buildProfileComparison } from '@/utils/workspace';

export interface GrantDetailModalSheetProps {
  grant: Grant | null;
  onApply: (grant: Grant) => void;
  onOpenProfile?: () => void;
}

export function GrantDetailModalSheet({
  grant,
  onApply,
  onOpenProfile,
}: GrantDetailModalSheetProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const records = useEligibilityPreflightStore((state) => state.records);
  const preflightStatus = useEligibilityPreflightStore((state) => state.status);
  const setCriterionStatus = useEligibilityPreflightStore((state) => state.setCriterionStatus);
  const resetGrantPreflight = useEligibilityPreflightStore((state) => state.resetGrantPreflight);

  useEffect(() => {
    void hydrateEligibilityPreflight();
  }, []);

  const preflightRecord = useMemo(
    () => (grant ? (records[grant.id] ?? buildDefaultPreflight(grant)) : null),
    [grant, records]
  );
  const preflightSummary = useMemo(
    () => (preflightRecord ? summarizePreflight(preflightRecord) : null),
    [preflightRecord]
  );

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);

  const matchReport = useMemo(
    () =>
      grant && activeProject && activeRevision
        ? buildProfileComparison(grant, activeProject, activeRevision)
        : null,
    [activeProject, activeRevision, grant]
  );

  if (!grant) return null;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.titleArea}>
          <AppText variant="h2">{grant.title}</AppText>
          <StatusBadge label={grant.funder} variant="neutral" />
          <StatusBadge label={`${grant.matchPct}% catalog score`} variant="neutral" />
        </View>
      </View>

      <View>
        <View style={styles.metaRow}>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.funding}
            </AppText>
            <AppText variant="metric-sm" color="main">
              {grant.amount}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.deadline}
            </AppText>
            <AppText variant="metric-sm" color="main">
              {grant.deadline}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.region}
            </AppText>
            <AppText variant="body" color="main">
              {grant.region}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.record}
            </AppText>
            <AppText variant="body">
              {ENV.DATA_SOURCE === 'mock' ? MODAL_COPY.mockRecord : MODAL_COPY.apiRecord}
            </AppText>
          </View>
        </View>

        <AppText variant="body" color="main" style={styles.summary}>
          {grant.summary}
        </AppText>
      </View>

      {matchReport && (
        <View
          style={[styles.reportBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <AppText variant="h3">
            Profile comparison ({matchReport.score}% catalog score · {matchReport.projectName})
          </AppText>
          <AppText variant="caption" color="muted">
            Profile revision {matchReport.profileRevisionId} · Saved: {matchReport.profileUpdatedAt}{' '}
            · Local field comparison; evidence and eligibility have not been verified.
          </AppText>

          <AppText variant="label">Profile information</AppText>
          {matchReport.profileFacts.map((item, idx) => (
            <View key={`align-${idx}`} style={styles.reportItem}>
              <AppText variant="body">• {item.clause}</AppText>
              <AppText variant="caption" color="main">
                {item.profileFact}
              </AppText>
            </View>
          ))}

          <AppText variant="label">Needs review</AppText>
          {matchReport.missingAreas.length === 0 ? (
            <AppText variant="caption" color="main">
              No missing fields were detected. This does not establish eligibility.
            </AppText>
          ) : (
            matchReport.missingAreas.map((item, idx) => (
              <View key={`gap-${idx}`} style={styles.reportItem}>
                <AppText variant="body">• {item.gap}</AppText>
                <AppText variant="caption" color="pending">
                  Action: {item.targetAction}
                </AppText>
              </View>
            ))
          )}
          {onOpenProfile && (
            <AppButton
              size="sm"
              variant="outline"
              label="Open Project Profile Dossier to Address Gaps"
              onPress={onOpenProfile}
            />
          )}

          <AppText variant="label">Eligibility review</AppText>
          {matchReport.eligibilityGates.map((gate) => (
            <View key={gate.rule} style={[styles.gateRow, { borderColor: theme.border }]}>
              <View style={styles.gateHeader}>
                <AppText variant="body">{gate.rule}</AppText>
                <StatusBadge
                  label={gate.status.toUpperCase()}
                  variant={
                    gate.status === 'pass'
                      ? 'verified'
                      : gate.status === 'review'
                        ? 'pending'
                        : 'neutral'
                  }
                />
              </View>
              <AppText variant="caption" color="muted">
                {gate.detail}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {preflightRecord && preflightSummary && (
        <View
          style={[styles.reportBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <AppText variant="h3">Interactive eligibility preflight</AppText>
          <AppText accessibilityLiveRegion="polite" variant="body">
            {preflightSummary.summaryText}
          </AppText>
          <AppText variant="caption" color="muted">
            {Object.keys(records).length === 0
              ? 'Select Confirmed, Needs review, or Unconfirmed below to save your preflight checklist on this device.'
              : preflightStatus === 'saving'
                ? 'Saving checklist…'
                : preflightStatus === 'session-only'
                  ? 'Checklist kept for this session only; device storage is unavailable.'
                  : 'Checklist choices saved on this device.'}
          </AppText>
          {preflightRecord.criteria.map((criterion) => (
            <View key={criterion.id} style={[styles.gateRow, { borderColor: theme.border }]}>
              <AppText variant="body">{criterion.label}</AppText>
              <View style={styles.preflightActions}>
                {(
                  [
                    ['met', 'Confirmed'],
                    ['review', 'Needs review'],
                    ['unconfirmed', 'Unconfirmed'],
                  ] as const
                ).map(([statusKey, label]) => (
                  <AppButton
                    key={statusKey}
                    size="sm"
                    variant="outline"
                    label={label}
                    accessibilityLabel={`${criterion.label}: ${label}`}
                    selected={criterion.status === statusKey}
                    onPress={() => setCriterionStatus(grant, criterion.id, statusKey)}
                  />
                ))}
              </View>
            </View>
          ))}
          <AppButton
            size="sm"
            variant="ghost"
            label="Reset preflight checklist"
            onPress={() => resetGrantPreflight(grant)}
          />
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <AppButton label={MODAL_COPY.apply} variant="primary" onPress={() => onApply(grant)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
    gap: SPACING.sm,
  },
  body: {
    flexGrow: 0,
  },
  content: { padding: SPACING.lg, gap: SPACING.lg },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  summary: {
    flexShrink: 1,
  },
  reportBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  reportItem: {
    gap: SPACING.xs,
  },
  gateRow: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  gateHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  preflightActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  footer: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
  },
});
