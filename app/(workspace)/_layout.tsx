import React from 'react';
import { Slot, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/templates/AppHeader';
import { WorkspaceNavigation } from '@/components/organisms/WorkspaceNavigation';
import { useTheme } from '@/hooks/useTheme';

export default function WorkspaceLayout() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AppHeader
        canGoBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/dashboard');
        }}
        onHome={() => router.navigate('/dashboard')}
      />
      <WorkspaceNavigation />
      <Slot />
    </SafeAreaView>
  );
}
