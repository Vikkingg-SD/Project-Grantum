import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes data freshness
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: (failureCount, error) =>
        !(
          error instanceof ApiError &&
          (error.code === 'CONFIG' || (error.status >= 400 && error.status < 500))
        ) && failureCount < 2,
      refetchOnWindowFocus: true,
      refetchInterval: false,
    },
  },
});
