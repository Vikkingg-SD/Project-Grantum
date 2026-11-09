import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Grant } from '@/types/grant';
import { GrantCard } from '../molecules/GrantCard';
import { AppText } from '../atoms/AppText';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { SPACING } from '@/config/theme';

export interface GrantDiscoveryGridProps {
  grants: Grant[];
  onSelect: (grant: Grant) => void;
  onApply: (grant: Grant) => void;
}

export function GrantDiscoveryGrid({ grants, onSelect, onApply }: GrantDiscoveryGridProps) {
  const { desktop } = useLayoutMetrics();
  if (!grants.length) {
    return (
      <View style={styles.empty}>
        <AppText variant="h3" color="muted">
          No matching grant opportunities
        </AppText>
        <AppText variant="body" color="muted" align="center" style={styles.emptySub}>
          Adjust regional parameters or check search filters.
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, desktop && styles.columns]}>
      {grants.map((grant) => (
        <View key={grant.id} style={desktop ? styles.column : styles.fullWidth}>
          <GrantCard
            key={grant.id}
            grant={grant}
            onSelect={() => onSelect(grant)}
            onApply={() => onApply(grant)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: SPACING.md,
  },
  column: { width: '49%', flexShrink: 1 },
  fullWidth: { width: '100%' },
  empty: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySub: {
    marginTop: 6,
  },
});
