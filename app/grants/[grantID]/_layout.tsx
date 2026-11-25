import React, { useEffect } from 'react';
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useUnstableGlobalHref,
} from 'expo-router';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useWorkAttempt } from '@/hooks/useWorkAttempt';
import { useActiveView } from '@/hooks/useActiveView';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { isValidGrantId } from '@/utils/navigationHistory';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';
import { useRememberLifecycle, useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { useDraftStore } from '@/store/useDraftStore';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { queryKeys } from '@/api/queryKeys';
import { ROUTE_COPY, NAV_COPY } from '@/config/copy';
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
  const localGrantId = useActiveGrantId();
  const { grantID: rawGlobalGrantId, attemptId } = useGlobalSearchParams<{
    grantID?: string | string[];
    attemptId?: string | string[];
  }>();
  const href = useUnstableGlobalHref();
  const pathname = usePathname();
  const hasGlobalGrantParam = rawGlobalGrantId !== undefined;
  const globalGrantId =
    typeof rawGlobalGrantId === 'string' && isValidGrantId(rawGlobalGrantId)
      ? rawGlobalGrantId
      : '';
  const grantID =
    pathname.startsWith('/grants/') && hasGlobalGrantParam ? globalGrantId : localGrantId;
  const { unavailable: attemptUnavailable } = useWorkAttempt(grantID, { attemptId });
  const queryClient = useQueryClient();
  const grant = useGrantDetail(grantID);
  const router = useRouter();
  const selectedName = useActiveView();
  const navigation = useAppNavigation(grantID);
  const { markInvalidPath } = useWorkspaceNavigation();
  const setLastGrantId = useDraftStore((state) => state.setLastGrantId);
  const isLoading = Boolean(grantID) && grant.isPending;
  const isUnavailable =
    attemptUnavailable || !grantID || grant.isError || (!grant.isPending && !grant.data);
  const cachedCatalog = queryClient.getQueryData<Grant[]>(queryKeys.grants());
  const confirmedByCatalog = Boolean(grantID && cachedCatalog?.some((item) => item.id === grantID));

  // Remember only confirmed grants (detail resolved or already validated in the loaded catalog)
  // so invalid or 404 grant URLs can never poison lastLifecycle or un-blacklist invalidPaths.
  const confirmedGrantId =
    !attemptUnavailable && grantID && !grant.isError && (Boolean(grant.data) || confirmedByCatalog)
      ? grantID
      : '';
  useRememberLifecycle(confirmedGrantId);
  useEffect(() => {
    if (confirmedGrantId) {
      setLastGrantId(confirmedGrantId);
    }
  }, [confirmedGrantId, setLastGrantId]);
  useEffect(() => {
    if (isUnavailable) {
      markInvalidPath(href);
    }
  }, [href, isUnavailable, markInvalidPath]);

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
                title={
                  isLoading
                    ? ROUTE_COPY.loadingTitle
                    : attemptUnavailable
                      ? 'Application unavailable'
                      : ROUTE_COPY.unavailableTitle
                }
                description={
                  isLoading
                    ? ROUTE_COPY.loadingGrant
                    : attemptUnavailable
                      ? 'This application could not be found for this opportunity.'
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
          <Stack.Screen name="post-award-tracker" options={{ title: NAV_COPY.progressTracking }} />
          {items.map((item) => (
            <Stack.Screen key={item.name} name={item.routePath} options={{ title: item.label }} />
          ))}
        </Stack>
      </View>
    </WorkspaceShell>
  );
}
