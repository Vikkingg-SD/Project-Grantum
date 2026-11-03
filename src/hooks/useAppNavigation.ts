import { useRouter } from 'expo-router';
import { useActiveGrantId } from './useActiveGrantId';
import { useActiveView, VIEW_PATHS, type AppView } from './useActiveView';

// Expo Router owns history, including browser Back and Forward.
export function useAppNavigation() {
  const router = useRouter();
  const grantID = useActiveGrantId();
  const view = useActiveView();
  return {
    canGoBack: router.canGoBack(),
    goBack: () => {
      if (router.canGoBack()) router.back();
    },
    navigateTo: (next: AppView, nextGrantID = grantID) => {
      if (!nextGrantID || (next === view && nextGrantID === grantID)) return;
      router.navigate({
        pathname: `/grants/[grantID]/${VIEW_PATHS[next]}` as const,
        params: { grantID: nextGrantID },
      });
    },
  };
}
