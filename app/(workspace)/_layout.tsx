import React from 'react';
import { Redirect, Slot, usePathname } from 'expo-router';
import { ENV } from '@/config/env';
import { WorkspaceShell } from '@/components/templates/WorkspaceShell';

const connectedViews: Record<string, string> = {
  '/discover': 'Discovery',
  '/my-works': 'My Works',
  '/project-profile': 'Project Profile',
  '/settings': 'Settings',
  '/admin': 'Staff',
  '/affiliate-campaign': 'Affiliate',
  '/form-templates': 'My Works',
};

export default function WorkspaceLayout() {
  const pathname = usePathname();
  if (ENV.DATA_SOURCE === 'api') {
    return (
      <Redirect
        href={{ pathname: '/connected', params: { view: connectedViews[pathname] ?? 'Dashboard' } }}
      />
    );
  }
  return (
    <WorkspaceShell>
      <Slot />
    </WorkspaceShell>
  );
}
