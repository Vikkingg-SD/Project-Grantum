import { QueryClient } from '@tanstack/react-query';
import { ENV } from '@/config/env';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes data freshness
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: 2,
      refetchOnWindowFocus: true,
      refetchInterval: false,
    },
  },
});
