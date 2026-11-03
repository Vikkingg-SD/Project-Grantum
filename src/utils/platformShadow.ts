import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemeMode } from '@/types/theme';
import { PALETTE, SHADOWS, withAlpha } from '@/config/theme';

type StatusTone = 'primary' | 'verified' | 'pending' | 'failure' | 'gold';

// SDK 57 / RN 0.86 boxShadow translates the reference's static glow to native
// and web without a renderer, animation loop, or a second history/state system.
export function platformShadow(mode: ThemeMode, tone?: StatusTone): ViewStyle {
  return {
    boxShadow: tone
      ? `0 0 ${SHADOWS.status.radius}px ${withAlpha(PALETTE[mode][tone], SHADOWS.status.opacity)}`
      : SHADOWS[mode],
  };
}

export function platformTextGlow(mode: ThemeMode): TextStyle & { textShadow?: string } {
  const color = withAlpha(PALETTE[mode].primary, SHADOWS.text.opacity);
  if (Platform.OS === 'web') {
    return { textShadow: `0 0 ${SHADOWS.text.radius}px ${color}` };
  }
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: SHADOWS.text.radius,
  };
}
