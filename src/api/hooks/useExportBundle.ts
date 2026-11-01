import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { queryKeys } from '../queryKeys';
import type { ExportRequest } from '@/types/api';
import { ApiError } from '../client';

export function useExportBundle(grantId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExportRequest) => {
      if (!grantId) throw new ApiError('Select a grant before exporting.', 0, 'VALIDATION');
      const result = await getDataSource().exportBundle(grantId, input);
      if (!result.success || !/^https?:\/\//i.test(result.downloadUrl) || !result.checksum) {
        throw new ApiError('No downloadable export was returned.', 0, 'INVALID_RESPONSE');
      }
      return result;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.draft(grantId) });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
