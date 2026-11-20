import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useActiveView } from '@/hooks/useActiveView';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';
import { useRememberLifecycle, useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { queryKeys } from '@/api/queryKeys';
import { ROUTE_COPY } from '@/config/copy';
import type { Grant } from '@/types/grant';
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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const grant = useGrantDetail(grantID);
  const router = useRouter();
  const selectedName = useActiveView();
  const navigation = useAppNavigation();
  const { markInvalidPath } = useWorkspaceNavigation();
  const isLoading = Boolean(grantID) && grant.isPending;
  const isUnavailable = !grantID || grant.isError || (!grant.isPending && !grant.data);
  const cachedCatalog = queryClient.getQueryData<Grant[]>(queryKeys.grants());
  const confirmedByCatalog = Boolean(grantID && cachedCatalog?.some((item) => item.id === grantID));

  // Remember only confirmed grants (detail resolved or already validated in the loaded catalog)
  // so invalid or 404 grant URLs can never poison lastLifecycle or un-blacklist invalidPaths.
  useRememberLifecycle(
    grantID && !grant.isError && (Boolean(grant.data) || confirmedByCatalog) ? grantID : ''
  );
  useEffect(() => {
    if (isUnavailable) {
      markInvalidPath(pathname);
    }
  }, [isUnavailable, markInvalidPath, pathname]);

  const items = navigationItemsForGrant(grantID).map((item) => ({
    ...item,
    disabled: item.disabled || isLoading || isUnavailable,
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
            isLoading || isUnavailable ? (
              <EmptyStateLayout
                title={isLoading ? ROUTE_COPY.loadingTitle : ROUTE_COPY.unavailableTitle}
                description={
                  isLoading
                    ? ROUTE_COPY.loadingGrant
                    : (grant.error?.message ?? 'This opportunity could not be found.')
                }
                ctaLabel={isLoading ? undefined : ROUTE_COPY.backDashboard}
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
