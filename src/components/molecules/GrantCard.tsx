import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { matchTier } from '@/utils/scoring';
import { Grant } from '@/types/grant';

export interface GrantCardProps {
  grant: Grant;
  onSelect: () => void;
  onApply: () => void;
}

export function GrantCard({ grant, onSelect, onApply }: GrantCardProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: pressed ? theme.primary : theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <StatusBadge label={grant.funder} variant="neutral" />
        <StatusBadge label={`${grant.matchPct}% match`} variant={matchTier(grant.matchPct)} />
      </View>
      <AppText variant="h3" style={styles.title} numberOfLines={2}>
        {grant.title}
      </AppText>
      <View style={styles.metricsGrid}>
        <View style={styles.metricColumn}>
          <AppText variant="caption" color="muted">
            Funding
          </AppText>
          <AppText variant="metric-sm" color="main">
            {grant.amount}
          </AppText>
        </View>
        <View style={styles.metricColumn}>
          <AppText variant="caption" color="muted">
            Deadline
          </AppText>
          <AppText variant="metric-sm" color="main">
            {grant.deadline}
          </AppText>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <AppText variant="caption" color="muted" style={styles.region}>
          {grant.region}
        </AppText>
        <View style={styles.actions}>
          <AppButton label="Details" variant="ghost" size="sm" onPress={onSelect} />
          <AppButton label="Apply" variant="primary" size="sm" onPress={onApply} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricColumn: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  region: {
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
