import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Share one platform subscription across controls, sheets and progress indicators.
const listeners = new Set<() => void>();
let reduced = true;
let unsubscribe: (() => void) | undefined;
let generation = 0;
let media: MediaQueryList | undefined;
function webPreference() {
  if (!media && Platform.OS === 'web' && typeof window !== 'undefined') {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return media;
}
function snapshot() {
  return webPreference()?.matches ?? reduced;
}
const serverSnapshot = () => true;
function publish(value: boolean) {
  reduced = value;
  listeners.forEach((notify) => notify());
}
function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    const query = webPreference();
    const version = ++generation;
    if (query) {
      const changed = () => publish(query.matches);
      query.addEventListener('change', changed);
      unsubscribe = () => query.removeEventListener('change', changed);
    } else if (Platform.OS !== 'web') {
      const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
        generation++;
        publish(value);
      });
      unsubscribe = () => subscription.remove();
      void AccessibilityInfo.isReduceMotionEnabled()
        .then((value) => {
          if (version === generation) publish(value);
        })
        .catch(() => {
          /* Keep motion reduced when the preference cannot be read. */
        });
    }
  }
  return () => {
    listeners.delete(notify);
    if (!listeners.size) {
      generation++;
      unsubscribe?.();
      unsubscribe = undefined;
    }
  };
}
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
