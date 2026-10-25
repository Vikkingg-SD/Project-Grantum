import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';
import { AppText } from './AppText';

export interface LoaderProps {
  label?: string;
}

export function Loader({ label = 'Calibrating instrument…' }: LoaderProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      {label && (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  label: {
    marginTop: 12,
  },
});
