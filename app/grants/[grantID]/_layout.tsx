import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useActiveView } from '@/hooks/useActiveView';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { AppHeader } from '@/components/templates/AppHeader';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import {
  TopTabNavigation,
  navigationItemsForGrant,
  type NavigationItem,
} from '@/components/organisms/TopTabNavigation';
import { AppScreenErrorBoundary, useRecoveryProbe } from '@/components/templates/AppErrorBoundary';
export { AppErrorBoundary as ErrorBoundary } from '@/components/templates/AppErrorBoundary';
export const unstable_settings = { screenErrorBoundary: AppScreenErrorBoundary };

export default function GrantLayout() {
  // Preserve the existing layout-level recovery probe across the route flip.
  useRecoveryProbe('tab');
  const theme = useTheme();
  const grantID = useActiveGrantId();
  const grant = useGrantDetail(grantID);
  const router = useRouter();
  const selectedName = useActiveView();
  const navigation = useAppNavigation();
  const items = navigationItemsForGrant(grantID).map((item) => ({
    ...item,
    disabled: item.disabled || !grant.data || grant.isError,
  }));
  const onSelect = (item: NavigationItem) => navigation.navigateTo(item.name);
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <AppHeader
        title={items.find((item) => item.name === selectedName)?.label}
        canGoBack={navigation.canGoBack}
        onBack={navigation.goBack}
      />
      <TopTabNavigation items={items} selectedName={selectedName} onSelect={onSelect} />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{ headerShown: false, animation: 'none' }}
          // Keep route registration alive while blocking unavailable screen content.
          screenLayout={({ children }) =>
            grant.isPending || grant.isError || !grant.data ? (
              <EmptyStateLayout
                title={grant.isPending ? 'Calibrating instrument…' : 'Opportunity unavailable'}
                description={grant.error?.message ?? 'Loading the selected opportunity.'}
                ctaLabel={grant.isPending ? undefined : 'Back to dashboard'}
                onCtaPress={() => router.replace('/dashboard')}
              />
            ) : (
              <>{children}</>
            )
          }
        >
          <Stack.Screen name="index" />
          {items.map((item) => (
            <Stack.Screen key={item.name} name={item.routePath} options={{ title: item.label }} />
          ))}
        </Stack>
      </View>
    </SafeAreaView>
  );
}
