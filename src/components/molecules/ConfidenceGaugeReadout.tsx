import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MetricGauge } from '../atoms/MetricGauge';
import { StatusBadge } from '../atoms/StatusBadge';
import { AppText } from '../atoms/AppText';
import { scoreTier, isExportUnlocked } from '@/utils/scoring';
import { TIERS } from '@/config/constants';
import { CONFIDENCE_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';

export interface ConfidenceGaugeReadoutProps {
  score: number;
}

export function ConfidenceGaugeReadout({ score }: ConfidenceGaugeReadoutProps) {
  const status = scoreTier(score, TIERS.confidence);
  const unlocked = isExportUnlocked(score);

  return (
    <View style={styles.container}>
      <MetricGauge value={score} tier={status} label={CONFIDENCE_COPY.label} />
      <View style={styles.readout}>
        <StatusBadge
          label={unlocked ? CONFIDENCE_COPY.unlocked : CONFIDENCE_COPY.locked}
          variant={status}
        />
        <AppText variant="caption" color="muted" style={styles.thresholdText}>
          {CONFIDENCE_COPY.thresholdPrefix}
          <AppText variant="metric-sm">{TIERS.confidence.pass}</AppText>
          {CONFIDENCE_COPY.thresholdSuffix}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl, width: '100%' },
  readout: { flex: 1, minWidth: 0, gap: SPACING.sm },
  thresholdText: { maxWidth: 176, flexShrink: 1 },
});
