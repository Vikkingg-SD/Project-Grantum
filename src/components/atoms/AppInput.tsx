import React, { useState } from 'react';
import {
  Platform,
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, TYPOGRAPHY, DESKTOP_TYPOGRAPHY } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  inputRef?: React.Ref<TextInput>;
}

const WEB_INPUT_RESET =
  Platform.OS === 'web'
    ? ({ outlineWidth: 0, outlineStyle: 'none' } as unknown as TextStyle)
    : null;

export function AppInput({
  label,
  error,
  icon,
  style,
  inputRef,
  onFocus,
  onBlur,
  ...props
}: AppInputProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const { desktop } = useLayoutMetrics();
  const [focused, setFocused] = useState(false);

  const focusColor = error ? theme.failureText : theme.primaryText;
  const webWrapperFocus =
    Platform.OS === 'web' && focused
      ? ({
          outlineWidth: 2,
          outlineStyle: 'solid',
          outlineColor: focusColor,
          outlineOffset: 1,
        } as unknown as ViewStyle)
      : null;

  return (
    <View style={styles.container}>
      {Boolean(label) && (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: error
              ? theme.failureText
              : focused
                ? theme.primaryText
                : theme.inputBorder,
          },
          webWrapperFocus,
        ]}
      >
        {Boolean(icon) && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          ref={inputRef}
          accessibilityLabel={label ?? props.placeholder}
          aria-invalid={Boolean(error)}
          placeholderTextColor={theme.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            TYPOGRAPHY.body,
            desktop && DESKTOP_TYPOGRAPHY.body,
            { color: theme.textMain },
            WEB_INPUT_RESET,
            icon ? styles.inputWithIcon : null,
            style,
          ]}
          {...props}
        />
      </View>
      {Boolean(error) && (
        <AppText variant="caption" color="failureText" style={styles.error}>
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
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 8,
  },
  inputWithIcon: {
    paddingLeft: 4,
  },
  error: {
    marginTop: 4,
  },
});
