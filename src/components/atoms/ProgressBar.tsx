import React, { useEffect } from 'react';
import { Animated, Easing, Platform, View, StyleSheet, useAnimatedValue } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const clamped = Math.max(0, Math.min(100, percent));
  const reduceMotion = useReduceMotion();
  const progress = useAnimatedValue(clamped);
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(clamped);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: clamped,
      duration: 240,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, progress, reduceMotion]);

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
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[styles.track, { backgroundColor: theme.subtle }]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              transform: [
                { scaleX: progress.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) },
              ],
              backgroundColor: theme.pending,
            },
          ]}
        />
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
    flexWrap: 'wrap',
    columnGap: SPACING.sm,
    rowGap: SPACING.xs,
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
    width: '100%',
    transformOrigin: 'left',
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
