import React from 'react';
import { Platform, Pressable, View, StyleSheet } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { LAYOUT } from '@/config/layout';
import { webStateTransition } from '@/config/motion';

export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ label, checked, onChange, disabled = false }: ToggleSwitchProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const reduceMotion = useReduceMotion();
  // Thumb and track share one transition so the state change reads as a single movement.
  const animated = Platform.OS === 'web' && !reduceMotion;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={({ pressed }) => [styles.target, { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}
    >
      <View
        style={[
          styles.track,
          animated && webStateTransition,
          {
            backgroundColor: checked ? theme.verified : theme.subtle,
            borderColor: theme.inputBorder,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            animated && webStateTransition,
            {
              backgroundColor: theme.textMain,
              transform: [{ translateX: checked ? 20 : 2 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
