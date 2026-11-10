import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';

/**
 * Prepared container for supporting copy and readouts. `surface` sits on the page canvas;
 * `subtle` sits inside an existing surface card, so cards never stack the same plate twice.
 */
export function InfoCard({
  children,
  tone = 'subtle',
  style,
}: {
  children: React.ReactNode;
  tone?: 'surface' | 'subtle';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        tone === 'surface'
          ? { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }
          : { backgroundColor: theme.subtle },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
});
