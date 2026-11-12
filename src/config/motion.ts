import type { ViewStyle } from 'react-native';

// One motion vocabulary for pressable feedback. Only transform and opacity ever animate.
export const MOTION = {
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  pressMs: 120,
  stateMs: 160,
  pressScale: 0.97,
  pressScaleLarge: 0.98,
} as const;

// Web compositing feedback; native press feedback stays immediate.
export const webPressTransition = {
  transitionProperty: 'opacity, transform',
  transitionDuration: `${MOTION.pressMs}ms`,
  transitionTimingFunction: MOTION.easeOut,
} as ViewStyle;

// State changes (switch thumb, selection) are slightly slower than press feedback.
export const webStateTransition = {
  transitionProperty: 'transform, background-color',
  transitionDuration: `${MOTION.stateMs}ms`,
  transitionTimingFunction: MOTION.easeOut,
} as ViewStyle;

// Scale only when the user allows movement; opacity feedback is always kept.
export function pressScale(
  pressed: boolean,
  reduceMotion: boolean,
  scale: number = MOTION.pressScale
) {
  return pressed && !reduceMotion ? { transform: [{ scale }] } : undefined;
}
