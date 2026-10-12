import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface AppTextProps extends TextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'metric-lg' | 'metric-sm';
  color?: 'main' | 'muted' | 'primary' | 'verified' | 'pending' | 'failure' | 'gold';
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
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  const colorStyles = {
    main: theme.textMain,
    muted: theme.textMuted,
    primary: theme.primary,
    verified: theme.verified,
    pending: theme.pending,
    failure: theme.failure,
    gold: theme.gold,
  };

  return (
    <Text
      style={[styles.base, styles[variant], { color: colorStyles[color], textAlign: align }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Inter',
  },
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  'metric-lg': {
    fontFamily: 'JetBrains Mono',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  'metric-sm': {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
