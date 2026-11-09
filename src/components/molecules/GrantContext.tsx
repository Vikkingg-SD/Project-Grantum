import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { SPACING } from '@/config/theme';

export function GrantContext({ grantId }: { grantId: string }) {
  const detail = useGrantDetail(grantId);
  return detail.data ? (
    <View style={styles.context}>
      <AppText variant="label">{detail.data.title}</AppText>
      <AppText variant="caption" color="muted">
        {detail.data.funder}
      </AppText>
    </View>
  ) : null;
}
const styles = StyleSheet.create({ context: { gap: SPACING.xs } });
