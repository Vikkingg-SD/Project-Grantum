import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';
import { BREAKPOINTS } from '@/config/layout';
import { AppHeader } from '@/components/templates/AppHeader';
import {
  TopTabNavigation,
  MobileTabNavigation,
  NAVIGATION_ITEMS,
} from '@/components/organisms/TopTabNavigation';
import { AppScreenErrorBoundary, useRecoveryProbe } from '@/components/templates/AppErrorBoundary';
export { AppErrorBoundary as ErrorBoundary } from '@/components/templates/AppErrorBoundary';
export const unstable_settings = { screenErrorBoundary: AppScreenErrorBoundary };

export default function TabsLayout() {
  useRecoveryProbe('tab');
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINTS.md;
  return (
    <SafeAreaView
      edges={wide ? ['bottom'] : []}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Tabs
        tabBar={({ state, navigation }) =>
          wide ? null : (
            <SafeAreaView
              edges={['bottom', 'left', 'right']}
              style={{ backgroundColor: theme.surface }}
            >
              <MobileTabNavigation
                selectedName={state.routes[state.index].name}
                onSelect={(item) => {
                  const route = state.routes.find((candidate) => candidate.name === item.name);
                  if (!route) return;
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            </SafeAreaView>
          )
        }
        screenOptions={{
          headerShown: true,
          header: ({ route }) => (
            <SafeAreaView
              edges={['top', 'left', 'right']}
              style={{ backgroundColor: theme.background }}
            >
              <AppHeader
                title={NAVIGATION_ITEMS.find((item) => item.name === route.name)?.label}
                canGoBack={router.canGoBack()}
                onBack={() => router.back()}
              />
              {wide ? (
                <TopTabNavigation
                  selectedName={route.name}
                  onSelect={(item) => router.navigate(item.href)}
                />
              ) : null}
            </SafeAreaView>
          ),
        }}
      >
        {NAVIGATION_ITEMS.map((item) => (
          <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
