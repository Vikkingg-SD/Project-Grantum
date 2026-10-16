import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MetricGauge } from '../atoms/MetricGauge';
import { StatusBadge } from '../atoms/StatusBadge';
import { AppText } from '../atoms/AppText';
import { scoreTier } from '@/utils/scoring';
import { CONFIDENCE_TIER } from '@/config/constants';

export interface ConfidenceGaugeReadoutProps {
  score: number;
  threshold?: number;
}

export function ConfidenceGaugeReadout({
  score,
  threshold = CONFIDENCE_TIER.pass,
}: ConfidenceGaugeReadoutProps) {
  const status = scoreTier(score, CONFIDENCE_TIER);

  return (
    <View style={styles.container}>
      <MetricGauge value={score} label="confidence" />
      <View style={styles.readout}>
        <StatusBadge
          label={score >= threshold ? 'Export unlocked' : 'Export locked'}
          variant={status}
        />
        <AppText variant="caption" color="muted" style={styles.thresholdText}>
          Threshold: {threshold} confidence
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  readout: {
    flex: 1,
    gap: 8,
  },
  thresholdText: {
    maxWidth: 176,
  },
});
