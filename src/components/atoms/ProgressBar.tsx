import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';

export interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <AppText variant="caption" color="muted">
            {label}
          </AppText>
          <AppText variant="metric-sm" color="main">
            {clamped}%
          </AppText>
        </View>
      )}
      <View style={[styles.track, { backgroundColor: theme.subtle }]}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: theme.pending }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
