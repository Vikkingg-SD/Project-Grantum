import React, { useEffect, useRef } from 'react';
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
import { WorkspaceNavigationProvider } from '@/hooks/useWorkspaceNavigation';
import { useRecoveryProbe } from '@/components/templates/AppErrorBoundary';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '@/config/posthog';
import { posthogLogger } from '@/config/posthogLogger';
import { getDataSource } from '@/api/dataSource';
import { useAuthStore } from '@/store/useAuthStore';
export { AppErrorBoundary as ErrorBoundary } from '@/components/templates/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function PostHogIdentity() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const lastSessionToken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) void hydrate().catch(() => undefined);
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (!hydrated || !posthog) return;
    const client = posthog;

    if (!token) {
      if (lastSessionToken.current !== null) {
        client.reset();
        lastSessionToken.current = null;
      }
      return;
    }

    if (lastSessionToken.current === token) return;

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    const identifySession = (retryOnFailure: boolean) => {
      void getDataSource()
        .getMe()
        .then((user) => {
          if (cancelled || useAuthStore.getState().token !== token) return;
          client.identify(user.id, {
            $set: {
              account_status: user.status,
              onboarding_completed: user.isOnboarded,
            },
          });
          lastSessionToken.current = token;
          posthogLogger.info('authenticated_session_identified', {
            identity_source: 'auth_me',
          });
        })
        .catch(() => {
          if (retryOnFailure && !cancelled && useAuthStore.getState().token === token) {
            retryTimeout = setTimeout(() => identifySession(false), 3000);
          }
        });
    };

    identifySession(true);
    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [hydrated, token]);

  return null;
}

export default function RootLayout() {
  useRecoveryProbe('root');
  const isReady = useAppReady();
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (isReady) {
      posthogLogger.info('application_ready', { component: 'root_layout' });
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
            {posthog ? (
              <PostHogProvider client={posthog}>
                <PostHogIdentity />
                <WorkspaceNavigationProvider>
                  <Slot />
                </WorkspaceNavigationProvider>
              </PostHogProvider>
            ) : (
              <WorkspaceNavigationProvider>
                <Slot />
              </WorkspaceNavigationProvider>
            )}
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
