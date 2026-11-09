import React from 'react';
import { Text, TextProps } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, TYPOGRAPHY, DESKTOP_TYPOGRAPHY } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof TYPOGRAPHY;
  color?:
    | 'main'
    | 'muted'
    | 'primary'
    | 'primaryForeground'
    | 'verified'
    | 'pending'
    | 'failure'
    | 'failureText'
    | 'gold'
    | 'mint';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function AppText({
  variant = 'body',
  color = 'main',
  align = 'auto',
  style,
  children,
  ...props
}: AppTextProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const { desktop } = useLayoutMetrics();

  const colorStyles = {
    main: theme.textMain,
    muted: theme.textMuted,
    primary: theme.primaryText,
    primaryForeground: theme.primaryForeground,
    verified: theme.verifiedText,
    pending: theme.pendingText,
    failure: theme.failureText,
    failureText: theme.failureText,
    gold: theme.goldText,
    mint: theme.verifiedText,
  };

  const isHeader =
    variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';

  return (
    <Text
      accessibilityRole={isHeader ? 'header' : undefined}
      style={[
        TYPOGRAPHY[variant],
        desktop && DESKTOP_TYPOGRAPHY[variant],
        { color: colorStyles[color], textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
