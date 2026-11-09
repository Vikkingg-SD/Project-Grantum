import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';

export function GrantContext({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const detail = useGrantDetail(grantId);
  return detail.data ? (
    <View style={[styles.context, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="label" align="center">
        {detail.data.title}
      </AppText>
      <AppText variant="caption" color="muted" align="center" numberOfLines={1}>
        {detail.data.funder}
      </AppText>
    </View>
  ) : null;
}
const styles = StyleSheet.create({
  context: { gap: SPACING.xs, padding: SPACING.md, borderWidth: 1, borderRadius: RADIUS.md },
});
