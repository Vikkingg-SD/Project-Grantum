import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ENV } from '@/config/env';
import { SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ProfileReadinessReport, ProjectProfileAuditRecord } from '@/types/workspace';
import { formatEventDate } from '@/utils/presentation';

export interface ProjectProfileAuditCardProps {
  readiness: ProfileReadinessReport;
  auditRecord?: ProjectProfileAuditRecord;
  unsaved: boolean;
  canEdit: boolean;
  canReview: boolean;
  projectSaved?: boolean;
  onRunAudit: () => void;
  onFixField: (key: string) => void;
  onOpenApplicationAudit?: () => void;
  containerRef?: React.Ref<View>;
}

const AUDIT_STATUS_UI = {
  audited: { label: 'Audited', variant: 'verified' as const },
  stale: { label: 'Re-audit needed', variant: 'pending' as const },
  'action-required': { label: 'Action required', variant: 'failure' as const },
  'not-audited': { label: 'Review required', variant: 'pending' as const },
};

export function ProjectProfileAuditCard({
  readiness,
  auditRecord,
  unsaved,
  canEdit,
  canReview,
  projectSaved = true,
  onRunAudit,
  onFixField,
  onOpenApplicationAudit,
  containerRef,
}: ProjectProfileAuditCardProps) {
  const theme = useTheme();
  const statusUi = AUDIT_STATUS_UI[readiness.auditStatus];

  return (
    <View
      ref={containerRef}
      testID="audit-project-profile-section"
      style={[styles.card, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
    >
      <View style={styles.rowBetween}>
        <AppText variant="h3">Audit project profile</AppText>
        <StatusBadge
          testID="profile-audit-status-badge"
          label={statusUi.label}
          variant={statusUi.variant}
        />
      </View>

      <AppText variant="caption" color="muted">
        {ENV.DATA_SOURCE === 'mock'
          ? 'Verify every profile field for detail thresholds, region and entity selections, and readiness consistency before marking items Complete.'
          : 'Run a project profile audit with your connected review service.'}
      </AppText>

      <View style={styles.rowWrap}>
        <AppButton
          variant="primary"
          label={auditRecord ? 'Re-run profile audit' : 'Audit project profile'}
          disabled={!canReview || !projectSaved}
          onPress={onRunAudit}
        />
        {onOpenApplicationAudit ? (
          <AppButton
            size="sm"
            variant="outline"
            label="Open Application Audit"
            onPress={onOpenApplicationAudit}
          />
        ) : null}
      </View>

      {!projectSaved ? (
        <AppText variant="caption" color="muted">
          Save this new project first, then run your profile audit.
        </AppText>
      ) : null}

      {unsaved && readiness.auditStatus === 'audited' ? (
        <AppText variant="caption" color="verified">
          Profile audited — save profile to commit these updates.
        </AppText>
      ) : null}

      {readiness.auditStatus === 'stale' ? (
        <AppText variant="caption" color="gold" accessibilityLiveRegion="polite">
          Profile fields changed since the last audit. Run profile audit again to mark updated
          fields Complete.
        </AppText>
      ) : null}

      {auditRecord ? (
        <View style={[styles.auditResults, { borderTopColor: theme.border }]}>
          <AppText variant="caption" color="muted">
            Last audited: {formatEventDate(auditRecord.auditedAt)} · {auditRecord.actor} ·{' '}
            {auditRecord.passedCount}/{auditRecord.totalCount} checks passed (
            {readiness.auditedScore}% verified)
          </AppText>

          {readiness.checklist.map((item) => {
            const auditedField = auditRecord.fieldResults[item.key];
            const itemStatusLabel =
              item.status === 'audited'
                ? 'Complete'
                : item.status === 'review-required'
                  ? 'Review required, go to audit'
                  : 'Needs detail';
            const itemColor =
              item.status === 'audited'
                ? 'verified'
                : item.status === 'review-required'
                  ? 'gold'
                  : 'failureText';
            return (
              <View key={item.key} style={[styles.fieldRow, { borderTopColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <AppText variant="body">{item.label}</AppText>
                  <AppText variant="caption" color={itemColor}>
                    {itemStatusLabel}
                  </AppText>
                </View>
                <AppText variant="caption" color="muted">
                  {item.status === 'audited'
                    ? (auditedField?.message ?? item.detailReason)
                    : item.detailReason}
                </AppText>
                {item.status === 'needs-detail' ? (
                  <AppButton
                    size="sm"
                    variant="ghost"
                    label={`Edit ${item.label}`}
                    disabled={!canEdit}
                    onPress={() => onFixField(item.key)}
                  />
                ) : null}
              </View>
            );
          })}

          {auditRecord.recommendations.length > 0 ? (
            <View style={[styles.recommendations, { borderTopColor: theme.border }]}>
              <AppText variant="label">Audit notes</AppText>
              {auditRecord.recommendations.map((note, idx) => (
                <AppText key={`${idx}-${note.slice(0, 16)}`} variant="caption" color="muted">
                  • {note}
                </AppText>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SPACING.md, borderTopWidth: 1, gap: SPACING.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  auditResults: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  fieldRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.xs,
    gap: SPACING.xs,
  },
  recommendations: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
});
