import React from 'react';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';
import PlansScreen from '@/screens/PlansScreen';

export default function PlansRoute() {
  return (
    <WorkspaceShell>
      <PlansScreen />
    </WorkspaceShell>
  );
}
