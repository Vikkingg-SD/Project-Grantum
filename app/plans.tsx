import React from 'react';
import { Redirect } from 'expo-router';
import { ENV } from '@/config/env';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';
import PlansScreen from '@/screens/PlansScreen';

export default function PlansRoute() {
  if (ENV.DATA_SOURCE === 'api')
    return <Redirect href={{ pathname: '/connected', params: { view: 'Plans' } }} />;
  return (
    <WorkspaceShell>
      <PlansScreen />
    </WorkspaceShell>
  );
}
