import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkspaceNavigation } from '@/components/organisms/WorkspaceNavigation';
import { AppHeader } from '@/components/templates/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';

export function WorkspaceShell({ children }: React.PropsWithChildren) {
  const { canGoBack, goBack, goHome } = useWorkspaceNavigation();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AppHeader
        canGoBack={canGoBack}
        onBack={goBack}
        onHome={goHome}
        homeLabel="Resume last grant view"
      />
      <WorkspaceNavigation />
      {children}
    </SafeAreaView>
  );
}
