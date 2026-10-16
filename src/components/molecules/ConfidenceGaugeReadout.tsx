import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MetricGauge } from '../atoms/MetricGauge';
import { StatusBadge } from '../atoms/StatusBadge';
import { AppText } from '../atoms/AppText';
import { scoreTier, isExportUnlocked } from '@/utils/scoring';
import { TIERS } from '@/config/constants';

export interface ConfidenceGaugeReadoutProps {
  score: number;
}

export function ConfidenceGaugeReadout({ score }: ConfidenceGaugeReadoutProps) {
  const status = scoreTier(score, TIERS.confidence);
  const unlocked = isExportUnlocked(score);

  return (
    <View style={styles.container}>
      <MetricGauge value={score} tier={status} label="confidence" />
      <View style={styles.readout}>
        <StatusBadge label={unlocked ? 'Export unlocked' : 'Export locked'} variant={status} />
        <AppText variant="caption" color="muted" style={styles.thresholdText}>
          Threshold: <AppText variant="metric-sm">{TIERS.confidence.pass}</AppText> confidence
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 20, width: '100%' },
  readout: { flex: 1, gap: 8 },
  thresholdText: { maxWidth: 176 },
});
