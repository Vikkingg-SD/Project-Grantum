import React from 'react';
import { Redirect } from 'expo-router';
import { useGrants } from '@/api/hooks/useGrants';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';

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
            ? 'Instrument fault'
            : grants.isPending
              ? 'Calibrating instrument…'
              : 'No opportunities found'
        }
        description={
          grants.error?.message ??
          (grants.isPending
            ? 'Loading your opportunities.'
            : 'There are no matching opportunities available.')
        }
        ctaLabel={!grants.isPending ? 'Try again' : undefined}
        onCtaPress={() => {
          void grants.refetch();
        }}
      />
    </ScreenContainer>
  );
}
