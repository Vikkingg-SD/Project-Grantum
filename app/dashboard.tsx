import React from 'react';
import { Redirect } from 'expo-router';
import { useGrants } from '@/api/hooks/useGrants';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { ROUTE_COPY } from '@/config/copy';

// Recovery links have no grant context; choose only from the queried catalog.
export default function DashboardEntryRoute() {
  const grants = useGrants();
  const grant = grants.data?.[0];
  if (grant) {
    return (
      <Redirect href={{ pathname: '/grants/[grantID]/dashboard', params: { grantID: grant.id } }} />
    );
  }
  return (
    <ScreenContainer>
      <EmptyStateLayout
        title={
          grants.isError
            ? ROUTE_COPY.faultTitle
            : grants.isPending
              ? ROUTE_COPY.loadingTitle
              : ROUTE_COPY.emptyTitle
        }
        description={
          grants.error?.message ??
          (grants.isPending ? ROUTE_COPY.loadingCatalog : ROUTE_COPY.emptyCatalog)
        }
        ctaLabel={!grants.isPending ? ROUTE_COPY.retry : undefined}
        onCtaPress={() => {
          void grants.refetch();
        }}
      />
    </ScreenContainer>
  );
}
