import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { useAward } from '@/api/hooks/useAward';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { ApiError } from '@/api/client';
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';

export default function PostAwardScreen() {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const grantId = useUIStore((state) => state.activeGrantId);
  const query = useAward(grantId);
  const detail = useGrantDetail(grantId);
  const error = query.error ?? detail.error;
  const absent = error instanceof ApiError && error.status === 404;
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
  const metrics = [
    { label: 'Award Total', value: award.amount },
    { label: 'Next Milestone', value: new Date(award.nextReportAt).toLocaleDateString() },
    { label: 'Compliance State', value: award.contractStatus },
  ];
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.heading}>
          <AppText variant="h1" style={{ flexShrink: 1 }}>
            Post-Award Tracking
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
          <AppText variant="h2">{detail.data.title}</AppText>
          <AppText variant="caption" color="muted">
            {detail.data.funder +
              ' · Submitted ' +
              new Date(award.submittedAt).toLocaleDateString()}
          </AppText>
          <View style={[styles.metrics, width / fontScale < 600 && styles.stacked]}>
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={[
                  styles.metric,
                  width / fontScale < 600 && { flexBasis: 'auto' },
                  { backgroundColor: theme.subtle },
                ]}
              >
                <AppText variant="caption" color="muted">
                  {metric.label}
                </AppText>
                <AppText variant="metric-sm">{metric.value}</AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Immutable Audit Trail</AppText>
          {award.events.length ? (
            award.events.map((event) => <AuditLogLine key={event.id} {...event} />)
          ) : (
            <AppText color="muted">No audit events recorded.</AppText>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  metrics: { flexDirection: 'row', gap: SPACING.sm },
  stacked: { flexDirection: 'column' },
  metric: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
});
