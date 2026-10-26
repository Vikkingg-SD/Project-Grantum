import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { Chip } from '../atoms/Chip';
import { SPACING } from '@/config/theme';

export interface FilterFieldGroupProps {
  label: string;
  options: string[];
  selected?: readonly string[];
  onToggle?: (option: string) => void;
  disabled?: boolean;
}

const EMPTY_SELECTION: readonly string[] = [];

export const FilterFieldGroup = memo(function FilterFieldGroup({
  label,
  options,
  selected = EMPTY_SELECTION,
  onToggle,
  disabled = false,
}: FilterFieldGroupProps) {
  const isDisabled = disabled || !onToggle;
  return (
    <View style={styles.container}>
      <AppText variant="caption" color="muted" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.row}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={selected.includes(option)}
            onToggle={() => onToggle?.(option)}
            disabled={isDisabled}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginVertical: SPACING.sm },
  label: { marginBottom: SPACING.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
});
