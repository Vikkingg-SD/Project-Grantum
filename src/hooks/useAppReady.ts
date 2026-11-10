import { useSyncExternalStore } from 'react';
import { useFonts } from 'expo-font';
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
    Inter_400Regular: require('@expo-google-fonts/inter/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/Inter_700Bold.ttf'),
    JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_700Bold: require('@expo-google-fonts/jetbrains-mono/JetBrainsMono_700Bold.ttf'),
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
