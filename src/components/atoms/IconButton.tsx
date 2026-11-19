import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeStore } from '@/store/useThemeStore';
import { FONT } from '@/config/fonts';
import { PALETTE, RADIUS } from '@/config/theme';
import { pressScale, webPressTransition } from '@/config/motion';
import { LAYOUT } from '@/config/layout';
import { AppText } from './AppText';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  badgeText?: string | null;
  badgeTestID?: string;
}

export function IconButton({
  icon,
  onPress,
  label,
  active = false,
  expanded,
  disabled = false,
  badgeText,
  badgeTestID,
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
        Platform.OS === 'web' && !reduceMotion && webPressTransition,
        {
          backgroundColor: active ? theme.subtle : 'transparent',
          borderColor: active ? theme.borderStrong : theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        pressScale(pressed, reduceMotion),
      ]}
    >
      {icon}
      {badgeText ? (
        <View
          testID={badgeTestID}
          style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.background }]}
        >
          <AppText numberOfLines={1} style={[styles.badgeText, { color: theme.primaryForeground }]}>
            {badgeText}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    minHeight: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  badgeText: {
    fontFamily: FONT.mono.bold,
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
