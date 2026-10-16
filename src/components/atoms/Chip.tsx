import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onToggle, disabled = false }: ChipProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <AppText
        variant="caption"
        style={{
          color: selected ? theme.primaryForeground : theme.textMuted,
          fontWeight: '600',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
});
