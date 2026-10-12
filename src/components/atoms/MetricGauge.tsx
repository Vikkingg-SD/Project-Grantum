import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface MetricGaugeProps {
  value: number; // 0 - 100
  label?: string;
  size?: number;
}

const GAUGE_RADIUS = 50;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

export function MetricGauge({ value, label = 'confidence', size = 128 }: MetricGaugeProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  const clamped = Math.max(0, Math.min(100, value));
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - clamped / 100);

  const getTierColor = () => {
    if (clamped >= 85) return theme.verified;
    if (clamped >= 40) return theme.pending;
    return theme.failure;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={styles.svg}>
        <Circle
          cx="60"
          cy="60"
          r={GAUGE_RADIUS}
          fill="none"
          stroke={theme.border}
          strokeWidth="8"
          strokeOpacity={0.4}
        />
        <Circle
          cx="60"
          cy="60"
          r={GAUGE_RADIUS}
          fill="none"
          stroke={getTierColor()}
          strokeWidth="8"
          strokeDasharray={`${GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.textContainer}>
        <AppText variant="metric-lg" style={{ color: getTierColor() }}>
          {clamped}
        </AppText>
        {label && (
          <AppText variant="caption" color="muted" align="center">
            {label}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
