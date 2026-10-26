import React, { memo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { BREAKPOINTS } from '@/config/layout';
import { GRANT_CARD_COPY } from '@/config/copy';
import { matchTier } from '@/utils/scoring';
import type { Grant } from '@/types/grant';

export interface GrantCardProps {
  grant: Grant;
  onSelect: () => void;
  onApply: () => void;
}

export const GrantCard = memo(function GrantCard({ grant, onSelect, onApply }: GrantCardProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <StatusBadge label={grant.funder} variant="neutral" />
        <StatusBadge
          label={GRANT_CARD_COPY.matchLabel(grant.matchPct)}
          variant={matchTier(grant.matchPct)}
        />
      </View>
      <AppText variant="h3" style={styles.title}>
        {grant.title}
      </AppText>
      <View style={styles.metricsGrid}>
        <View style={styles.metricColumn}>
          <AppText variant="caption" color="muted">
            {GRANT_CARD_COPY.funding}
          </AppText>
          <AppText variant="metric-sm" color="main">
            {grant.amount}
          </AppText>
        </View>
        <View style={styles.metricColumn}>
          <AppText variant="caption" color="muted">
            {GRANT_CARD_COPY.deadline}
          </AppText>
          <AppText variant="metric-sm" color="main">
            {grant.deadline}
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.footer,
          width < BREAKPOINTS.sm && styles.footerStacked,
          { borderTopColor: theme.border },
        ]}
      >
        <AppText variant="caption" color="muted" style={styles.region}>
          {grant.region}
        </AppText>
        <View style={styles.actions}>
          <AppButton label={GRANT_CARD_COPY.details} variant="ghost" size="sm" onPress={onSelect} />
          <AppButton label={GRANT_CARD_COPY.apply} variant="primary" size="sm" onPress={onApply} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: { marginBottom: SPACING.lg, flexShrink: 1 },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metricColumn: { flex: 1, minWidth: 0 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  footerStacked: { flexDirection: 'column', alignItems: 'stretch' },
  region: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
