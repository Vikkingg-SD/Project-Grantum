import React from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { StatusBadge, type StatusBadgeProps } from '../atoms/StatusBadge';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { LAYOUT } from '@/config/layout';
import { pressScale, webPressTransition } from '@/config/motion';

export interface PressableBadgeProps extends StatusBadgeProps {
  // Names the action, not the value: the badge text already states the value.
  actionLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Slop fix: the badge box stays compact, but the tap target is padded out to the 44px minimum
// with hitSlop (no layout change), exposes a button role, and gives immediate press feedback.
const BADGE_HEIGHT = 28;
const SLOP_Y = Math.ceil((LAYOUT.minTouchTarget - BADGE_HEIGHT) / 2);
const HIT_SLOP = { top: SLOP_Y, bottom: SLOP_Y, left: 4, right: 4 } as const;

export function PressableBadge({ actionLabel, onPress, style, ...badge }: PressableBadgeProps) {
  const reduceMotion = useReduceMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}. ${actionLabel}`}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        Platform.OS === 'web' && !reduceMotion && webPressTransition,
        { opacity: pressed ? 0.8 : 1 },
        pressScale(pressed, reduceMotion),
        style,
      ]}
    >
      <StatusBadge {...badge} style={styles.fill} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: { maxWidth: '100%', flexShrink: 1 },
  fill: { alignSelf: 'stretch' },
});
