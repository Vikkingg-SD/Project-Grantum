import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export default function RootLayout() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const { width } = useWindowDimensions();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <View style={[styles.stage, width >= 1024 && styles.desktopStage]}>
            <Slot />
          </View>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stage: {
    flex: 1,
    width: '100%',
  },
  desktopStage: {
    maxWidth: 1280,
    alignSelf: 'center',
  },
});
