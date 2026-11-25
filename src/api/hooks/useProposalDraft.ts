import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import type { ProposalDraft, SectionMutation, SectionState, DataSource } from '@/types/api';
import { queryKeys } from '../queryKeys';
import { applySectionMutation } from '@/utils/scoring';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';

function emptyAttemptDraft(draft: ProposalDraft): ProposalDraft {
  return {
    ...draft,
    requiredSections: [...DEFAULT_REQUIRED_SECTIONS],
    completedSections: [],
    completionPct: 0,
    confidenceScore: 0,
    body: '',
  };
}

export function useProposalDraft(grantId: string, slotKey?: string) {
  return useQuery<ProposalDraft>({
    queryKey: queryKeys.draft(grantId),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getProposalDraft(grantId);
    },
    enabled: Boolean(grantId),
    select: slotKey?.startsWith('attempt:') ? emptyAttemptDraft : undefined,
  });
}

export function useMutateProposalSections(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation(sectionMutationOptions(grantId, queryClient));
}

interface OptimisticContext {
  previous: ProposalDraft;
  optimistic: ProposalDraft | undefined;
}

export function sectionMutationOptions(
  grantId: string,
  queryClient: QueryClient,
  source: DataSource = getDataSource()
): UseMutationOptions<SectionState, Error, SectionMutation, OptimisticContext | undefined> {
  return {
    mutationKey: queryKeys.sections(grantId),
    scope: { id: `sections:${grantId}` },
    mutationFn: async (payload: SectionMutation) => {
      if (!grantId) throw new Error('Select a grant before editing sections.');
      return source.mutateSections(grantId, payload);
    },
    onMutate: async (payload: SectionMutation) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.draft(grantId) });
      const previous = queryClient.getQueryData<ProposalDraft>(queryKeys.draft(grantId));
      if (!previous || queryClient.isMutating({ mutationKey: queryKeys.sections(grantId) }) > 1) {
        return undefined;
      }
      const optimistic = applySectionMutation(previous, payload);
      const applied = queryClient.setQueryData<ProposalDraft>(queryKeys.draft(grantId), optimistic);
      return { previous, optimistic: applied };
    },
    onError: (_error, _payload, context) => {
      if (context && queryClient.getQueryData(queryKeys.draft(grantId)) === context.optimistic) {
        queryClient.setQueryData(queryKeys.draft(grantId), context.previous);
      }
    },
    onSuccess: (sections) => {
      queryClient.setQueryData<ProposalDraft>(queryKeys.draft(grantId), (draft) =>
        draft
          ? {
              ...draft,
              completedSections: sections.completedSections,
              requiredSections: sections.requiredSections,
              confidenceScore: sections.confidenceScore,
              completionPct: sections.requiredSections.length ? sections.confidenceScore : 0,
            }
          : draft
      );
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: queryKeys.sections(grantId) }) > 1) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.draft(grantId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.audit(grantId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
  };
}
