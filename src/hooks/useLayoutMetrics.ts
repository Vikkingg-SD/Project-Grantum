import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '@/config/layout';

export function useLayoutMetrics() {
  const { width, height, fontScale } = useWindowDimensions();
  const effectiveWidth = width / Math.max(1, fontScale);
  return {
    width,
    height,
    effectiveWidth,
    mobile: effectiveWidth < BREAKPOINTS.md,
    desktop: effectiveWidth >= BREAKPOINTS.lg,
  };
}
