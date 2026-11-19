import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useActiveView } from '@/hooks/useActiveView';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';
import { useRememberLifecycle } from '@/hooks/useWorkspaceNavigation';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { ROUTE_COPY } from '@/config/copy';
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
  const grantID = useActiveGrantId();
  const grant = useGrantDetail(grantID);
  const router = useRouter();
  const selectedName = useActiveView();
  const navigation = useAppNavigation();
  useRememberLifecycle(grant.data && !grant.isError ? grantID : '');
  const items = navigationItemsForGrant(grantID).map((item) => ({
    ...item,
    disabled: item.disabled || !grant.data || grant.isError,
  }));
  const onSelect = (item: NavigationItem) => navigation.navigateTo(item.name);
  return (
    <WorkspaceShell>
      <TopTabNavigation items={items} selectedName={selectedName} onSelect={onSelect} />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{ headerShown: false, animation: 'none' }}
          // Keep route registration alive while blocking unavailable screen content.
          screenLayout={({ children }) =>
            grant.isPending || grant.isError || !grant.data ? (
              <EmptyStateLayout
                title={grant.isPending ? ROUTE_COPY.loadingTitle : ROUTE_COPY.unavailableTitle}
                description={grant.error?.message ?? ROUTE_COPY.loadingGrant}
                ctaLabel={grant.isPending ? undefined : ROUTE_COPY.backDashboard}
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
    </WorkspaceShell>
  );
}
