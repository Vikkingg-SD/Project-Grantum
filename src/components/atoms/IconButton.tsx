import React from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  label,
  active = false,
  expanded,
  disabled = false,
}: IconButtonProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const reduceMotion = useReduceMotion();
  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityLabel={label}
      accessibilityState={{ disabled, expanded }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        Platform.OS === 'web' && !reduceMotion && webFeedback,
        {
          backgroundColor: active ? theme.subtle : 'transparent',
          borderColor: active ? theme.borderStrong : theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const webFeedback = {
  transitionProperty: 'opacity',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as ViewStyle;
