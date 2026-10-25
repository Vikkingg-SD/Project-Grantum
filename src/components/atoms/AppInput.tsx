import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { FONT } from '@/config/fonts';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function AppInput({ label, error, icon, style, ...props }: AppInputProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.failure : theme.border,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            { color: theme.textMain, fontFamily: FONT.sans.regular },
            icon ? styles.inputWithIcon : null,
            style,
          ]}
          {...props}
        />
      </View>
      {error && (
        <AppText variant="caption" color="failure" style={styles.error}>
          {error}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 4,
  },
  error: {
    marginTop: 4,
  },
});
