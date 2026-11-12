import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { BREAKPOINTS } from '@/config/layout';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GRANT_CARD_COPY } from '@/config/copy';
import { matchTier } from '@/utils/scoring';
import type { Grant } from '@/types/grant';

export interface GrantCardProps {
  grant: Grant;
  onSelect: (grant: Grant) => void;
  onApply: (grant: Grant) => void;
}

export const GrantCard = memo(function GrantCard({ grant, onSelect, onApply }: GrantCardProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const { effectiveWidth: width } = useLayoutMetrics();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <AppText
          variant="caption"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ flex: 1, minWidth: 0 }}
          color="muted"
        >
          {grant.funder}
        </AppText>
        <Pressable onPress={() => onSelect(grant)}>
          <StatusBadge
            label={GRANT_CARD_COPY.matchLabel(grant.matchPct)}
            variant={matchTier(grant.matchPct)}
          />
        </Pressable>
      </View>
      <AppText variant="h3" style={styles.title}>
        {grant.title}
      </AppText>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricColumn, { backgroundColor: theme.subtle }]}>
          <AppText variant="caption" color="muted">
            {GRANT_CARD_COPY.funding}
          </AppText>
          <AppText variant="metric-sm" color="main">
            {grant.amount}
          </AppText>
        </View>
        <View style={[styles.metricColumn, { backgroundColor: theme.subtle }]}>
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
        <View style={[styles.actions, width < BREAKPOINTS.sm && styles.actionsStacked]}>
          <AppButton
            label={GRANT_CARD_COPY.details}
            variant="ghost"
            size="sm"
            onPress={() => onSelect(grant)}
          />
          <AppButton
            label={GRANT_CARD_COPY.apply}
            variant="primary"
            size="sm"
            onPress={() => onApply(grant)}
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: { textAlign: 'center', marginBottom: SPACING.md, flexShrink: 1 },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metricColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
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
  // Actions own the right edge in both layouts: auto margin on a wrapped row, an explicit full
  // width with flex-end when stacked. No flexWrap, so the two buttons always stay one aligned row.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
    gap: SPACING.sm,
  },
  actionsStacked: { alignSelf: 'stretch', width: '100%', marginLeft: 0 },
});
