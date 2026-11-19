import React from 'react';
import { Redirect } from 'expo-router';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function IndexRoute() {
  const tourCompleted = useWorkspaceStore((state) => state.launchTourCompleted);
  return <Redirect href={tourCompleted ? '/dashboard' : '/onboarding'} />;
}
