import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoint';
import { ProposalDraft } from '@/types/api';

export function useProposalDraft(grantId: string) {
  return useQuery<ProposalDraft>({
    queryKey: ['proposal-draft', grantId],
    queryFn: async () => {
      const response = await apiClient.get(ENDPOINTS.PROPOSAL_DRAFT(grantId));
      return response.data;
    },
    enabled: Boolean(grantId),
  });
}

export function useMutateProposalSections(grantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { action: 'remove' | 'add' | 'restore'; sectionName: string }) => {
      const response = await apiClient.patch(ENDPOINTS.PROPOSAL_SECTIONS(grantId), payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-draft', grantId] });
      queryClient.invalidateQueries({ queryKey: ['audit-status', grantId] });
    },
  });
}
