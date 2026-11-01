import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, SPACING, TYPOGRAPHY } from '@/config/theme';
import { BREAKPOINTS } from '@/config/layout';
import { NAV_COPY } from '@/config/copy';
import { AppText } from '@/components/atoms/AppText';
import { AppHeader } from '@/components/templates/AppHeader';
import { TopTabNavigation, NAVIGATION_ITEMS } from '@/components/organisms/TopTabNavigation';
import { AppScreenErrorBoundary, useRecoveryProbe } from '@/components/templates/AppErrorBoundary';
export { AppErrorBoundary as ErrorBoundary } from '@/components/templates/AppErrorBoundary';

export const unstable_settings = { screenErrorBoundary: AppScreenErrorBoundary };

export default function TabsLayout() {
  useRecoveryProbe('tab');
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= BREAKPOINTS.md;

  return (
    <SafeAreaView
      edges={wide ? ['bottom'] : []}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Tabs
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
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            display: wide ? 'none' : 'flex',
            height:
              SPACING['2xl'] +
              TYPOGRAPHY.caption.lineHeight * 2 +
              SPACING.sm +
              Math.max(insets.bottom, SPACING.sm),
            paddingBottom: Math.max(insets.bottom, SPACING.sm),
            paddingTop: SPACING.sm,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelPosition: 'below-icon',
        }}
      >
        {NAVIGATION_ITEMS.map((item) => (
          <Tabs.Screen
            key={item.name}
            name={item.name}
            options={{
              title: item.label,
              tabBarAccessibilityLabel: item.locked
                ? `${item.label}, ${NAV_COPY.lockedPreview}`
                : item.label,
              tabBarIcon: ({ color, size }) => <item.icon color={color} size={size} />,
              tabBarLabel: ({ focused }) => (
                <AppText
                  variant="caption"
                  color={focused ? 'primary' : 'muted'}
                  numberOfLines={2}
                  align="center"
                >
                  {item.label}
                </AppText>
              ),
            }}
          />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
