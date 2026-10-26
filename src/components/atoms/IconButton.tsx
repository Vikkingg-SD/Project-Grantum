import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  label,
  active = false,
  disabled = false,
}: IconButtonProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
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
