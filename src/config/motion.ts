import type { ViewStyle } from 'react-native';

// One motion vocabulary for pressable feedback and progress waves. Only transform and opacity animate.
export const MOTION = {
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  pressMs: 120,
  stateMs: 160,
  roadmapPulseMs: 5000,
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

// GPU-composited CSS keyframes for the 5-second covered roadmap wave on web (compiled via StyleSheet.create).
// Must use CSS string transforms because react-native-web does not preprocess RN array transforms inside keyframes.
export const ROADMAP_WAVE_KEYFRAMES = {
  '0%': { transform: 'translateX(-120%)', opacity: 0 },
  '15%': { opacity: 0.88 },
  '75%': { opacity: 0.88 },
  '100%': { transform: 'translateX(240%)', opacity: 0 },
};

// Scale only when the user allows movement; opacity feedback is always kept.
export function pressScale(
  pressed: boolean,
  reduceMotion: boolean,
  scale: number = MOTION.pressScale
) {
  return pressed && !reduceMotion ? { transform: [{ scale }] } : undefined;
}
