import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface StatusBadgeProps {
  label: string;
  variant?: 'verified' | 'pending' | 'failure' | 'neutral' | 'brand' | 'gold';
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  const getColors = () => {
    switch (variant) {
      case 'verified':
        return { bg: theme.verified + '1A', border: theme.verified + '66', text: theme.verified };
      case 'pending':
        return { bg: theme.pending + '1A', border: theme.pending + '66', text: theme.pending };
      case 'failure':
        return { bg: theme.failure + '1A', border: theme.failure + '66', text: theme.failure };
      case 'brand':
        return { bg: theme.primary + '1A', border: theme.primary + '66', text: theme.primary };
      case 'gold':
        return { bg: theme.gold + '1A', border: theme.gold + '66', text: theme.gold };
      case 'neutral':
      default:
        return { bg: theme.subtle, border: theme.border, text: theme.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <AppText variant="caption" style={{ color: colors.text, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
