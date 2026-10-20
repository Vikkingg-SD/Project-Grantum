import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/api/queryClient';
import { useThemeStore } from '@/store/useThemeStore';
import { useAppReady } from '@/hooks/useAppReady';
import { PALETTE } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const isReady = useAppReady();
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <View style={[styles.stage, width >= LAYOUT.contentMaxWidth && styles.desktopStage]}>
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
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
  },
});
