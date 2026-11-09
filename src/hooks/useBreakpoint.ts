import { useLayoutMetrics } from './useLayoutMetrics';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { mobile, desktop } = useLayoutMetrics();
  if (mobile) return 'mobile';
  if (!desktop) return 'tablet';
  return 'desktop';
}
