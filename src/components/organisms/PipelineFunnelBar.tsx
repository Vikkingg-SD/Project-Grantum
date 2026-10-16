import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface FunnelStage {
  label: string;
  count: number;
}

export interface PipelineFunnelBarProps {
  stages: FunnelStage[];
}

export function PipelineFunnelBar({ stages }: PipelineFunnelBarProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {stages.map((stage, index) => {
        const terminal = index === stages.length - 1;
        const valueColor = terminal ? theme.gold : theme.primary;
        const labelColor = terminal ? theme.gold : theme.textMuted;
        return (
          <React.Fragment key={stage.label}>
            <View style={styles.stage}>
              <AppText variant="caption" style={[styles.label, { color: labelColor }]}>
                {stage.label}
              </AppText>
              <AppText variant="metric-lg" style={{ color: valueColor }}>
                {stage.count}
              </AppText>
            </View>
            {index < stages.length - 1 && (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          </React.Fragment>
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginVertical: 8,
    gap: 8,
  },
  stage: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  separator: {
    height: 1,
    width: 24,
  },
});
