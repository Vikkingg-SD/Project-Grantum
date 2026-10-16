import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppText } from '../atoms/AppText';
import { Chip } from '../atoms/Chip';

export interface FilterFieldGroupProps {
  label: string;
  options: string[];
  selected?: string[];
  onToggle?: (option: string) => void;
}

export function FilterFieldGroup({
  label,
  options,
  selected = [],
  onToggle,
}: FilterFieldGroupProps) {
  return (
    <View style={styles.container}>
      <AppText variant="caption" color="muted" style={styles.label}>
        {label}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={selected.includes(opt)}
            onToggle={() => onToggle?.(opt)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
