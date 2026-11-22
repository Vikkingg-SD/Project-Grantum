import { useRouter } from 'expo-router';
import { useActiveGrantId } from './useActiveGrantId';
import { useActiveView, VIEW_PATHS, type AppView } from './useActiveView';

export function useAppNavigation(overrideGrantID?: string) {
  const router = useRouter();
  const localGrantID = useActiveGrantId();
  const grantID = overrideGrantID ?? localGrantID;
  const view = useActiveView();
  return {
    navigateTo: (next: AppView, nextGrantID = grantID) => {
      if (!nextGrantID || (next === view && nextGrantID === grantID)) return;
      router.navigate({
        pathname: `/grants/[grantID]/${VIEW_PATHS[next]}` as const,
        params: { grantID: nextGrantID },
      });
    },
  };
}
