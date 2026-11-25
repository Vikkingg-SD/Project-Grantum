import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useActiveGrantId } from './useActiveGrantId';
import { useActiveView, VIEW_PATHS, type AppView } from './useActiveView';

export function useAppNavigation(overrideGrantID?: string) {
  const router = useRouter();
  const localGrantID = useActiveGrantId();
  const grantID = overrideGrantID ?? localGrantID;
  const view = useActiveView();
  const { attemptId } = useGlobalSearchParams<{ attemptId?: string | string[] }>();
  const activeAttemptId = typeof attemptId === 'string' ? attemptId : undefined;
  return {
    navigateTo: (
      next: AppView,
      nextGrantID = grantID,
      nextAttemptId = nextGrantID === grantID ? activeAttemptId : undefined
    ) => {
      if (!nextGrantID) return;
      const sameView = next === view && nextGrantID === grantID;
      if (sameView && nextAttemptId === activeAttemptId) return;
      const href = {
        pathname: `/grants/[grantID]/${VIEW_PATHS[next]}` as const,
        params: { grantID: nextGrantID, attemptId: nextAttemptId },
      };
      if (sameView) router.push(href);
      else router.navigate(href);
    },
  };
}
