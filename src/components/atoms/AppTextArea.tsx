import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, TYPOGRAPHY, DESKTOP_TYPOGRAPHY } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';

export interface AppTextAreaProps extends TextInputProps {
  label?: string;
  charLimit?: number;
  inputRef?: React.Ref<TextInput>;
}

export function AppTextArea({
  label,
  charLimit,
  value,
  style,
  inputRef,
  ...props
}: AppTextAreaProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const { desktop } = useLayoutMetrics();
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
            borderColor: isOver ? theme.failureText : theme.inputBorder,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          aria-invalid={isOver}
          multiline
          textAlignVertical="top"
          placeholderTextColor={theme.textMuted}
          value={value}
          maxLength={charLimit}
          style={[
            styles.textArea,
            TYPOGRAPHY.body,
            desktop && DESKTOP_TYPOGRAPHY.body,
            { color: theme.textMain },
            style,
          ]}
          {...props}
        />
      </View>
      {charLimit !== undefined && (
        <AppText
          variant="caption"
          align="right"
          color={isOver ? 'failureText' : 'muted'}
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
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 120,
    padding: 12,
  },
  textArea: {
    minHeight: 96,
  },
  counter: {
    marginTop: 4,
  },
});
