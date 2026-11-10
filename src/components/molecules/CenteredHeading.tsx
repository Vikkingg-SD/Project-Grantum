import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, type AppTextProps } from '../atoms/AppText';
import { LAYOUT } from '@/config/layout';
import { SPACING } from '@/config/theme';

/** Equal side slots keep the title centered on its container, not the remaining space. */
export function CenteredHeading({
  title,
  leading,
  variant = 'h1',
  color = 'main',
}: {
  title: string;
  leading?: React.ReactNode;
  variant?: AppTextProps['variant'];
  color?: AppTextProps['color'];
}) {
  return (
    <View style={styles.row}>
      {leading && <View style={styles.side}>{leading}</View>}
      <AppText
        variant={variant}
        color={color}
        align="center"
        style={styles.title}
        accessibilityLiveRegion={variant === 'caption' ? 'polite' : undefined}
      >
        {title}
      </AppText>
      {leading && <View style={styles.side} accessible={false} />}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  side: { width: LAYOUT.minTouchTarget, flexShrink: 0 },
  title: { flex: 1, minWidth: 0 },
});
