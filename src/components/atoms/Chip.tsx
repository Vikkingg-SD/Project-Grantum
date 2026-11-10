import React from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onToggle, disabled = false }: ChipProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const reduceMotion = useReduceMotion();
  const isDisabled = disabled || !onToggle;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: isDisabled }}
      aria-checked={selected}
      onPress={onToggle}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.chip,
        Platform.OS === 'web' && !reduceMotion && webFeedback,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: isDisabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={selected ? 'primaryForeground' : 'muted'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    maxWidth: '100%',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
});

const webFeedback = {
  transitionProperty: 'opacity',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as ViewStyle;
