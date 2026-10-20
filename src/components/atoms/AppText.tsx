import React from 'react';
import { Text, TextProps } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, TYPOGRAPHY } from '@/config/theme';

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

  const colorStyles = {
    main: theme.textMain,
    muted: theme.textMuted,
    primary: theme.primary,
    primaryForeground: theme.primaryForeground,
    verified: theme.verified,
    pending: theme.pending,
    failure: theme.failure,
    failureText: theme.failureText,
    gold: theme.gold,
    mint: theme.mint,
  };

  const isHeader =
    variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';

  return (
    <Text
      accessibilityRole={isHeader ? 'header' : undefined}
      maxFontSizeMultiplier={1.4}
      style={[TYPOGRAPHY[variant], { color: colorStyles[color], textAlign: align }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
