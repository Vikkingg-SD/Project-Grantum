import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[
        styles.track,
        {
          backgroundColor: checked ? theme.verified : theme.subtle,
          borderColor: checked ? theme.verified : theme.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: theme.textMain,
            transform: [{ translateX: checked ? 20 : 2 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
  },
});
