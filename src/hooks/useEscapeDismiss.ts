import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface EscapeLayer {
  id: number;
  dismiss: () => void;
}

let nextLayerId = 1;
const activeLayers: EscapeLayer[] = [];

export function dismissTopEscapeLayer(): boolean {
  const top = activeLayers[activeLayers.length - 1];
  if (!top) return false;
  top.dismiss();
  return true;
}

export function hasActiveEscapeLayer(): boolean {
  return activeLayers.length > 0;
}

/**
 * Registers a non-modal expandable panel/popover/dropdown in a LIFO Escape stack on web.
 * Pressing Escape closes only the topmost registered panel before in-app Back navigation fires.
 */
export function useEscapeDismiss(active: boolean, onDismiss: () => void): void {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!active || Platform.OS !== 'web') return;
    const id = nextLayerId++;
    activeLayers.push({
      id,
      dismiss: () => dismissRef.current(),
    });
    return () => {
      const idx = activeLayers.findIndex((entry) => entry.id === id);
      if (idx !== -1) activeLayers.splice(idx, 1);
    };
  }, [active]);
}
