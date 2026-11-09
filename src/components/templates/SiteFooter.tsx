import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { ENV } from '@/config/env';
import { SPACING } from '@/config/theme';

// V7.2 SiteFooter copy; never describe API data as a mock preview.
export function SiteFooter() {
  const theme = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <AppText variant="caption" color="muted" align="center">
        Grantum - Find funding. Build your application.
      </AppText>
      {ENV.DATA_SOURCE === 'mock' && (
        <AppText variant="caption" color="muted" align="center">
          Interactive preview - Sample data - Session-only edits
        </AppText>
      )}
      <AppText variant="caption" color="muted" align="center">
        © 2026 Grantum. All rights reserved.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING['2xl'],
    gap: SPACING.xs,
    alignItems: 'center',
  },
});
