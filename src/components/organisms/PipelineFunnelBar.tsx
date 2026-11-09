import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
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
  const { effectiveWidth } = useLayoutMetrics();
  const columns = effectiveWidth >= 900 ? 6 : effectiveWidth >= 320 ? 3 : 2;
  const theme = PALETTE[mode];

  return (
    <View style={styles.card}>
      {stages.map((stage, index) => {
        const terminal = index === stages.length - 1;
        const valueColor = terminal ? theme.goldText : theme.primaryText;
        const labelColor = terminal ? theme.goldText : theme.textMuted;

        return (
          <View key={stage.label} style={[styles.stage, { width: `${100 / columns}%` }]}>
            <View
              style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="caption" style={[styles.label, { color: labelColor }]}>
                {stage.label}
              </AppText>
              <AppText variant="metric-lg" style={{ color: valueColor }}>
                {stage.count}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs },
  stage: { padding: SPACING.xs },
  tile: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  label: { textAlign: 'left' },
});
