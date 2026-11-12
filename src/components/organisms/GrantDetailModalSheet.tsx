import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Grant } from '@/types/grant';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { MODAL_COPY } from '@/config/copy';
import { ENV } from '@/config/env';
import { matchTier } from '@/utils/scoring';
import { buildVerifiableMatch } from '@/utils/workspace';

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

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);

  const matchReport = useMemo(
    () =>
      grant && activeProject && activeRevision
        ? buildVerifiableMatch(grant, activeProject, activeRevision)
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
          <StatusBadge label={`${grant.matchPct}% match`} variant={matchTier(grant.matchPct)} />
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
            Verifiable Match Breakdown ({matchReport.score}% vs. {matchReport.projectName})
          </AppText>
          <AppText variant="caption" color="muted">
            Grounded against Profile Revision {matchReport.profileRevisionId} · Verified:{' '}
            {matchReport.lastVerifiedAt} · Official Catalog Ref: {matchReport.officialUrl}
          </AppText>

          <AppText variant="label">1. Verified Alignment</AppText>
          {matchReport.verifiedAlignments.map((item, idx) => (
            <View key={`align-${idx}`} style={styles.reportItem}>
              <AppText variant="body">• {item.clause}</AppText>
              <AppText variant="caption" color="verified">
                {item.profileFact}
              </AppText>
            </View>
          ))}

          <AppText variant="label">2. Missing / Weak Areas</AppText>
          {matchReport.missingAreas.length === 0 ? (
            <AppText variant="caption" color="verified">
              All core dossier fields are populated for this opportunity.
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

          <AppText variant="label">3. Hard Eligibility Gate</AppText>
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
  footer: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
  },
});
