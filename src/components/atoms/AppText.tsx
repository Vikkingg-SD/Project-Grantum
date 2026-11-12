import React from 'react';
import { Platform, Text, TextProps, type TextStyle } from 'react-native';
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
  // Web only: balance short titles, avoid orphans in captions. Never applied to body prose.
  const wrap = Platform.OS === 'web' && (isHeader || variant === 'caption');
  const wrapStyle = wrap
    ? ({ textWrap: isHeader ? 'balance' : 'pretty' } as unknown as TextStyle)
    : undefined;

  return (
    <Text
      accessibilityRole={isHeader ? 'header' : undefined}
      style={[
        TYPOGRAPHY[variant],
        desktop && DESKTOP_TYPOGRAPHY[variant],
        wrapStyle,
        { color: colorStyles[color], textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
