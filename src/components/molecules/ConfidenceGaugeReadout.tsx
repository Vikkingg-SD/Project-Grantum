import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SPACING } from '@/config/theme';

export interface ConfidenceGaugeReadoutProps {
  score: number;
}
export function ConfidenceGaugeReadout({ score }: ConfidenceGaugeReadoutProps) {
  return (
    <View style={styles.container}>
      <ProgressBar percent={score} label="Required sections present" />
      <AppText variant="caption" color="muted">
        Completeness measures your checklist, not an audit verdict.
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({ container: { gap: SPACING.sm, width: '100%' } });
