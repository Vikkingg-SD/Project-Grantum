import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { ProposalDraft, SectionMutation } from '@/types/api';
import { queryKeys } from '../queryKeys';
import { applySectionMutation } from '@/utils/scoring';

export function useProposalDraft(grantId: string) {
  return useQuery<ProposalDraft>({
    queryKey: queryKeys.draft(grantId),
    queryFn: async () => {
      const ds = getDataSource();
      return ds.getProposalDraft(grantId);
    },
    enabled: Boolean(grantId),
  });
}

export function useMutateProposalSections(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.sections(grantId),
    scope: { id: `sections:${grantId}` },
    mutationFn: async (payload: SectionMutation) => {
      if (!grantId) throw new Error('Select a grant before editing sections.');
      const ds = getDataSource();
      return ds.mutateSections(grantId, payload);
    },
    onMutate: async (payload: SectionMutation) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.draft(grantId) });
      const previous = queryClient.getQueryData<ProposalDraft>(queryKeys.draft(grantId));
      if (!previous || queryClient.isMutating({ mutationKey: queryKeys.sections(grantId) }) > 1) {
        return undefined;
      }
      const optimistic = applySectionMutation(previous, payload);
      const applied = queryClient.setQueryData(queryKeys.draft(grantId), optimistic);
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
  });
}
