import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';
import { FONT } from '@/config/fonts';

export interface AppTextAreaProps extends TextInputProps {
  label?: string;
  charLimit?: number;
}

export function AppTextArea({ label, charLimit, value, style, ...props }: AppTextAreaProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const count = typeof value === 'string' ? value.length : 0;
  const isOver = charLimit !== undefined && count > charLimit;

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.textWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: isOver ? theme.failure : theme.border,
          },
        ]}
      >
        <TextInput
          multiline
          textAlignVertical="top"
          placeholderTextColor={theme.textMuted}
          value={value}
          maxLength={charLimit}
          style={[styles.textArea, { color: theme.textMain, fontFamily: FONT.sans.regular }, style]}
          {...props}
        />
      </View>
      {charLimit !== undefined && (
        <AppText
          variant="caption"
          align="right"
          color={isOver ? 'failure' : 'muted'}
          style={styles.counter}
        >
          {count}/{charLimit}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  label: {
    marginBottom: 6,
  },
  textWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 120,
    padding: 12,
  },
  textArea: {
    fontSize: 14,
    minHeight: 96,
  },
  counter: {
    marginTop: 4,
  },
});
