import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

function getInitialReduceMotion(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(getInitialReduceMotion);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduceMotion
      );
      return () => subscription.remove();
    }
  }, []);

  return reduceMotion;
}
