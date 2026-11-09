import { useSyncExternalStore } from 'react';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useThemeStore } from '@/store/useThemeStore';

function subscribeToHydration(notify: () => void) {
  const start = useThemeStore.persist.onHydrate(notify);
  const finish = useThemeStore.persist.onFinishHydration(notify);
  return () => {
    start();
    finish();
  };
}
const hydrationSnapshot = () => useThemeStore.persist.hasHydrated();
const serverHydrationSnapshot = () => false;

export function useAppReady(): boolean {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // React rechecks the snapshot when subscribing, including hydration that
  // completes between render and subscription on a cached reload.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    hydrationSnapshot,
    serverHydrationSnapshot
  );

  return Boolean(fontsLoaded && hydrated);
}
