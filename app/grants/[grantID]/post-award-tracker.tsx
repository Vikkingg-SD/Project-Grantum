import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';

// Preserve legacy /post-award-tracker links by redirecting to /progress-tracking.
export default function LegacyPostAwardRedirect() {
  const grantID = useActiveGrantId();
  const { attemptId } = useLocalSearchParams<{ attemptId?: string | string[] }>();
  if (!grantID) {
    return <Redirect href="/dashboard" />;
  }
  return (
    <Redirect
      href={{
        pathname: '/grants/[grantID]/progress-tracking',
        params: { grantID, attemptId },
      }}
    />
  );
}
