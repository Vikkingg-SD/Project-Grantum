import React from 'react';
import { Slot } from 'expo-router';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';

export default function WorkspaceLayout() {
  return (
    <WorkspaceShell>
      <Slot />
    </WorkspaceShell>
  );
}
