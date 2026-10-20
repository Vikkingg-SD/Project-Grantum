import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, withAlpha } from '@/config/theme';

export interface StatusBadgeProps {
  label: string;
  variant?: 'verified' | 'pending' | 'failure' | 'neutral' | 'brand' | 'gold';
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];

  const getColors = () => {
    switch (variant) {
      case 'verified':
        return {
          bg: withAlpha(theme.verified, 0.1),
          border: withAlpha(theme.verified, 0.4),
          text: theme.verified,
        };
      case 'pending':
        return {
          bg: withAlpha(theme.pending, 0.1),
          border: withAlpha(theme.pending, 0.4),
          text: theme.pending,
        };
      case 'failure':
        return {
          bg: withAlpha(theme.failure, 0.1),
          border: withAlpha(theme.failure, 0.4),
          text: theme.failure,
        };
      case 'brand':
        return {
          bg: withAlpha(theme.primary, 0.1),
          border: withAlpha(theme.primary, 0.4),
          text: theme.primary,
        };
      case 'gold':
        return {
          bg: withAlpha(theme.gold, 0.1),
          border: withAlpha(theme.gold, 0.4),
          text: theme.gold,
        };
      case 'neutral':
      default:
        return { bg: theme.subtle, border: theme.border, text: theme.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <AppText variant="caption" style={{ color: colors.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
