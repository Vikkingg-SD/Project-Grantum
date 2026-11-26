import React from 'react';
import { Redirect } from 'expo-router';
import { ENV } from '@/config/env';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function IndexRoute() {
  const tourCompleted = useWorkspaceStore((state) => state.launchTourCompleted);
  if (ENV.DATA_SOURCE === 'api') return <Redirect href="/connected" />;
  return <Redirect href={tourCompleted ? '/dashboard' : '/onboarding'} />;
}
