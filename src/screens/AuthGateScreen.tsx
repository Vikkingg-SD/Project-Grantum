import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';

// RUL-SSU-06: auth gating is deferred. No fake login or session is exposed.
// This planned surface is not registered as a route or an authentication control.
export default function AuthGateScreen() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <EmptyStateLayout
        title="Authentication deferred"
        description="Authentication is not available in this preview."
        ctaLabel="Back to dashboard"
        onCtaPress={() => router.replace('/dashboard')}
      />
    </ScreenContainer>
  );
}
