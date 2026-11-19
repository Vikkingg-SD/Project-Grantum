import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/useThemeStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { LAYOUT } from '@/config/layout';
import { MOTION, pressScale, ROADMAP_WAVE_KEYFRAMES, webPressTransition } from '@/config/motion';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import {
  getCoveredProgressRatio,
  getDefaultRoadmapStageId,
  PRODUCT_ROADMAP_STAGES,
  statusLabelForStage,
  type ProductRoadmapStage,
  type RoadmapStageAccent,
} from '@/utils/productRoadmap';

export interface ProductRoadmapTrackProps {
  stages?: readonly ProductRoadmapStage[];
  compact?: boolean;
}

export function ProductRoadmapTrack({
  stages = PRODUCT_ROADMAP_STAGES,
  compact = false,
}: ProductRoadmapTrackProps) {
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const reduceMotion = useReduceMotion();
  const { effectiveWidth } = useLayoutMetrics();
  const [selectedId, setSelectedId] = useState(() => getDefaultRoadmapStageId(stages));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [coveredWidth, setCoveredWidth] = useState(0);
  const [nativeWave] = useState(() => new Animated.Value(0));
  const nodeRefs = useRef<(View | null)[]>([]);

  const selectedStage = stages.find((stage) => stage.id === selectedId) ?? stages[0];
  const coveredRatio = getCoveredProgressRatio(stages);
  const halfStepPct = stages.length > 0 ? 100 / (2 * stages.length) : 0;
  const useShortLabels = compact || effectiveWidth < 1100;

  useEffect(() => {
    if (Platform.OS === 'web' || reduceMotion || coveredWidth <= 0) {
      nativeWave.setValue(0);
      return;
    }
    nativeWave.setValue(0);
    const loop = Animated.loop(
      Animated.timing(nativeWave, {
        toValue: 1,
        duration: MOTION.roadmapPulseMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [coveredWidth, nativeWave, reduceMotion]);

  if (!selectedStage) return null;

  const accentHex = (accent: RoadmapStageAccent): string => {
    switch (accent) {
      case 'verified':
        return theme.verified;
      case 'pending':
        return theme.pending;
      case 'primary':
        return theme.primary;
      case 'gold':
        return theme.gold;
      case 'violet':
      default:
        return mode === 'dark' ? '#A78BFA' : '#7C3AED';
    }
  };

  const statusTextColor = (
    status: ProductRoadmapStage['status']
  ): 'primary' | 'verified' | 'muted' => {
    if (status === 'current') return 'primary';
    if (status === 'completed') return 'verified';
    return 'muted';
  };

  const waveBg = withAlpha('#FFFFFF', mode === 'dark' ? 0.58 : 0.8);
  const checkIconColor = mode === 'dark' ? '#04140B' : '#FFFFFF';

  const nativeWaveStyle =
    Platform.OS !== 'web' && !reduceMotion && coveredWidth > 0
      ? {
          transform: [
            {
              translateX: nativeWave.interpolate({
                inputRange: [0, 1],
                outputRange: [-coveredWidth * 0.5, coveredWidth * 1.2],
              }),
            },
          ],
          opacity: nativeWave.interpolate({
            inputRange: [0, 0.15, 0.75, 1],
            outputRange: [0, 0.88, 0.88, 0],
          }),
        }
      : undefined;

  const focusStageAt = (targetIndex: number) => {
    const next = stages[targetIndex];
    if (!next) return;
    setSelectedId(next.id);
    const el = nodeRefs.current[targetIndex] as unknown as { focus?: () => void } | null;
    el?.focus?.();
  };

  return (
    <View
      testID="product-roadmap-track"
      role={Platform.OS === 'web' ? 'region' : undefined}
      accessibilityLabel="Grantum product roadmap"
      style={[
        styles.container,
        compact && styles.containerCompact,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.railArea}>
        <View
          style={[
            styles.railTrack,
            {
              left: `${halfStepPct}%`,
              right: `${halfStepPct}%`,
              backgroundColor: theme.border,
            },
          ]}
        >
          <View
            testID="roadmap-covered-line"
            onLayout={(event) => {
              if (Platform.OS === 'web') return;
              const nextWidth = event.nativeEvent.layout.width;
              if (nextWidth > 0 && nextWidth !== coveredWidth) setCoveredWidth(nextWidth);
            }}
            style={[
              styles.coveredFill,
              {
                width: `${coveredRatio * 100}%`,
                backgroundColor: theme.primary,
              },
            ]}
          >
            {Platform.OS === 'web' ? (
              <View
                testID="roadmap-covered-pulse"
                style={[
                  styles.waveOverlay,
                  { backgroundColor: waveBg },
                  reduceMotion ? styles.waveStatic : styles.waveWebAnimated,
                ]}
              />
            ) : (
              !reduceMotion && (
                <Animated.View
                  testID="roadmap-covered-pulse"
                  style={[styles.waveOverlay, { backgroundColor: waveBg }, nativeWaveStyle]}
                />
              )
            )}
          </View>
        </View>

        <View style={styles.nodesRow}>
          {stages.map((stage, stageIndex) => {
            const isSelected = stage.id === selectedStage.id;
            const isFocused = focusedId === stage.id;
            const isCurrent = stage.status === 'current';
            const isCompleted = stage.status === 'completed';
            const color = accentHex(stage.accent);
            const nodeSize = isCurrent ? 26 : 22;
            const dotBackground =
              isCompleted || isCurrent ? color : withAlpha(color, mode === 'dark' ? 0.24 : 0.16);
            const visibleLabel = useShortLabels ? stage.shortLabel : stage.label;
            const statusText = statusLabelForStage(stage.status);
            const accessibleName =
              visibleLabel === stage.label
                ? `${stage.label} — ${statusText}`
                : `${visibleLabel} (${stage.label}) — ${statusText}`;
            const webKeyProps =
              Platform.OS === 'web'
                ? ({
                    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
                      if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        focusStageAt((stageIndex + 1) % stages.length);
                      } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        focusStageAt((stageIndex - 1 + stages.length) % stages.length);
                      } else if (event.key === 'Home') {
                        event.preventDefault();
                        focusStageAt(0);
                      } else if (event.key === 'End') {
                        event.preventDefault();
                        focusStageAt(stages.length - 1);
                      }
                    },
                  } as Record<string, unknown>)
                : {};
            return (
              <View key={stage.id} style={styles.nodeColumn}>
                <Pressable
                  ref={(node) => {
                    nodeRefs.current[stageIndex] = node;
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={accessibleName}
                  accessibilityState={{ selected: isSelected }}
                  aria-pressed={Platform.OS === 'web' ? isSelected : undefined}
                  onPress={() => setSelectedId(stage.id)}
                  onFocus={() => setFocusedId(stage.id)}
                  onBlur={() => setFocusedId((prev) => (prev === stage.id ? null : prev))}
                  {...webKeyProps}
                  style={({ pressed }) => [
                    styles.nodeButton,
                    Platform.OS === 'web' && !reduceMotion && webPressTransition,
                    pressScale(pressed, reduceMotion),
                  ]}
                >
                  <View
                    style={[
                      styles.nodeHalo,
                      isFocused
                        ? {
                            borderColor: theme.primary,
                            backgroundColor: withAlpha(
                              theme.primary,
                              mode === 'dark' ? 0.28 : 0.18
                            ),
                          }
                        : isSelected
                          ? {
                              borderColor: color,
                              backgroundColor: withAlpha(color, mode === 'dark' ? 0.22 : 0.14),
                            }
                          : isCurrent
                            ? { borderColor: withAlpha(color, 0.55) }
                            : styles.nodeHaloIdle,
                    ]}
                  >
                    <View
                      style={[
                        styles.nodeDot,
                        {
                          width: nodeSize,
                          height: nodeSize,
                          borderRadius: nodeSize / 2,
                          backgroundColor: dotBackground,
                          borderColor: color,
                          borderWidth: isCompleted || isCurrent ? 0 : 2.5,
                        },
                      ]}
                    >
                      {isCompleted && <Check size={13} color={checkIconColor} strokeWidth={3} />}
                      {isCurrent && (
                        <View
                          style={[styles.currentCore, { backgroundColor: theme.primaryForeground }]}
                        />
                      )}
                    </View>
                  </View>
                  <AppText
                    variant="caption"
                    color={isSelected ? 'main' : 'muted'}
                    align="center"
                    numberOfLines={1}
                    style={isSelected ? styles.nodeLabelActive : styles.nodeLabel}
                  >
                    {visibleLabel}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View
        testID="roadmap-stage-callout"
        accessibilityLiveRegion="polite"
        style={[styles.callout, { backgroundColor: theme.subtle }]}
      >
        <View style={styles.calloutHeader}>
          <AppText
            variant={compact || effectiveWidth < 960 ? 'body' : 'label'}
            color="main"
            style={styles.calloutTitle}
          >
            {selectedStage.headline}
          </AppText>
          <AppText variant="caption" color={statusTextColor(selectedStage.status)}>
            {statusLabelForStage(selectedStage.status)}
          </AppText>
        </View>
        <AppText variant="caption" color="muted">
          {selectedStage.detail}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  containerCompact: {
    padding: SPACING.md,
  },
  railArea: {
    position: 'relative',
    width: '100%',
  },
  railTrack: {
    position: 'absolute',
    top: 17 - 3,
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  coveredFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    position: 'relative',
  },
  waveOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '48%',
    borderRadius: RADIUS.full,
  },
  waveStatic: {
    opacity: 0,
  },
  waveWebAnimated: {
    animationKeyframes: ROADMAP_WAVE_KEYFRAMES,
    animationDuration: `${MOTION.roadmapPulseMs}ms`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  } as ViewStyle,
  nodesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: SPACING.xs,
    width: '100%',
  },
  nodeColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  nodeButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.xs,
  },
  nodeHalo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeHaloIdle: {
    borderColor: 'transparent',
  },
  nodeDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeLabel: {
    maxWidth: '100%',
  },
  nodeLabelActive: {
    maxWidth: '100%',
    fontWeight: '600',
  },
  callout: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    minHeight: 72,
    justifyContent: 'center',
  },
  calloutHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  calloutTitle: {
    flexShrink: 1,
    minWidth: 0,
    fontWeight: '600',
  },
});
