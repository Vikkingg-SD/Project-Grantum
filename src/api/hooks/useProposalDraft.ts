import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { ProposalDraft, SectionMutation } from '@/types/api';

export function useProposalDraft(grantId: string) {
  return useQuery<ProposalDraft>({
    queryKey: ['proposal-draft', grantId],
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
    mutationFn: async (payload: SectionMutation) => {
      const ds = getDataSource();
      return ds.mutateSections(grantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-draft', grantId] });
      queryClient.invalidateQueries({ queryKey: ['audit-status', grantId] });
    },
  });
}
