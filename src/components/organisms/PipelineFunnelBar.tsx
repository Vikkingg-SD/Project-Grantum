import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';

export interface FunnelStage {
  label: string;
  count: number;
}

export interface PipelineFunnelBarProps {
  stages: FunnelStage[];
}

export function PipelineFunnelBar({ stages }: PipelineFunnelBarProps) {
  const mode = useThemeStore((state) => state.mode);
  const { width, fontScale } = useWindowDimensions();
  const columns = width / fontScale >= 900 ? 6 : width / fontScale >= 320 ? 3 : 2;
  const theme = PALETTE[mode];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {stages.map((stage, index) => {
        const terminal = index === stages.length - 1;
        const valueColor = terminal ? theme.gold : theme.primary;
        const labelColor = terminal ? theme.gold : theme.textMuted;

        return (
          <View key={stage.label} style={[styles.stage, { width: `${100 / columns}%` }]}>
            <AppText variant="caption" style={[styles.label, { color: labelColor }]}>
              {stage.label}
            </AppText>
            <AppText variant="metric-lg" style={{ color: valueColor }}>
              {stage.count}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  stage: {
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
  label: {
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
