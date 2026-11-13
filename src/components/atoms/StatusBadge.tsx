import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, withAlpha } from '@/config/theme';

export interface StatusBadgeProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'verified' | 'pending' | 'failure' | 'neutral' | 'brand' | 'gold';
}

export function StatusBadge({ label, variant = 'neutral', style }: StatusBadgeProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];

  const getColors = () => {
    switch (variant) {
      case 'verified':
        return {
          bg: withAlpha(theme.verified, 0.1),
          border: withAlpha(theme.verified, 0.4),
          text: theme.verifiedText,
        };
      case 'pending':
        return {
          bg: withAlpha(theme.pending, 0.1),
          border: withAlpha(theme.pending, 0.4),
          text: theme.pendingText,
        };
      case 'failure':
        return {
          bg: withAlpha(theme.failure, 0.1),
          border: withAlpha(theme.failure, 0.4),
          text: theme.failureText,
        };
      case 'brand':
        return {
          bg: withAlpha(theme.primary, 0.1),
          border: withAlpha(theme.primary, 0.4),
          text: theme.primaryText,
        };
      case 'gold':
        return {
          bg: withAlpha(theme.gold, 0.1),
          border: withAlpha(theme.gold, 0.4),
          text: theme.goldText,
        };
      case 'neutral':
      default:
        return { bg: theme.subtle, border: theme.border, text: theme.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      <AppText
        variant="caption"
        accessibilityLabel={label}
        style={{ color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
