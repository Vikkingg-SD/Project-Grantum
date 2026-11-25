import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { useGrants } from '@/api/hooks/useGrants';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { LAYOUT } from '@/config/layout';
import { MOTION } from '@/config/motion';
import { RADIUS, SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { workspaceReturnPath } from '@/utils/workspaceReturn';
import { posthog } from '@/config/posthog';

const slides = [
  {
    title: 'Explore funding opportunities.',
    body: 'Browse funding opportunities and compare their requirements with your project profile. Scores do not verify eligibility or evidence.',
  },
  {
    title: 'Give every requirement a place in your draft.',
    body: 'Build a proposal in a structured workspace that keeps funder requirements visible while you write.',
  },
  {
    title: 'Check your sections before the final review.',
    body: 'Run a section-completeness check, review your document, and see what remains before export.',
  },
] as const;

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { mobile, effectiveWidth } = useLayoutMetrics();
  const router = useRouter();
  const { replay, returnTo } = useLocalSearchParams<{
    replay?: string | string[];
    returnTo?: string | string[];
  }>();
  const isReplay = replay === '1' || (Array.isArray(replay) && replay[0] === '1');
  const replayReturnPath = isReplay && returnTo ? workspaceReturnPath(returnTo) : null;
  const grants = useGrants();
  const completeLaunchTour = useWorkspaceStore((state) => state.completeLaunchTour);
  const [slideOpacity] = useState(() => new Animated.Value(1));
  const mounted = useRef(false);
  const slide = slides[index];
  const final = index === slides.length - 1;
  const compactPhone = effectiveWidth < 380;
  const stageHeight = compactPhone ? 320 : mobile ? 284 : 236;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reduceMotion) {
      slideOpacity.setValue(1);
      return;
    }
    slideOpacity.setValue(0.65);
    const animation = Animated.timing(slideOpacity, {
      toValue: 1,
      duration: MOTION.stateMs,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [index, reduceMotion, slideOpacity]);

  const finish = () => {
    if (!isReplay) {
      completeLaunchTour();
      posthog?.capture('onboarding_completed');
    }
    if (replayReturnPath && replayReturnPath !== '/dashboard') {
      router.replace(replayReturnPath);
      return;
    }
    const grant = grants.data?.[0];
    if (grant) {
      router.replace({
        pathname: '/grants/[grantID]/dashboard',
        params: { grantID: grant.id },
      });
    } else {
      router.replace('/dashboard');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View
          testID="onboarding-card"
          style={[
            styles.card,
            mobile && styles.mobileCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIdentity}>
              <AppText variant={compactPhone ? 'h3' : 'h2'} numberOfLines={1}>
                Grantum
              </AppText>
              <AppText
                variant={compactPhone ? 'label' : 'metric-sm'}
                color="primary"
                numberOfLines={1}
              >
                {String(index + 1).padStart(2, '0')} / 03
              </AppText>
            </View>
            <View style={styles.skipSlot}>
              {!final && (
                <AppButton
                  size="sm"
                  label="Skip tour"
                  variant="ghost"
                  onPress={finish}
                  style={styles.skipButton}
                />
              )}
            </View>
          </View>

          <ScrollView
            testID="onboarding-slide-stage"
            nestedScrollEnabled
            style={{ height: stageHeight }}
            contentContainerStyle={styles.slideStageContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.slideCopy, { opacity: slideOpacity }]}>
              <AppText variant={compactPhone ? 'h1' : 'display'}>{slide.title}</AppText>
              <AppText>{slide.body}</AppText>
            </Animated.View>
          </ScrollView>

          <View style={styles.steps} accessibilityLabel={`Step ${index + 1} of ${slides.length}`}>
            {slides.map((_, step) => (
              <View
                key={step}
                style={[
                  styles.step,
                  { backgroundColor: step <= index ? theme.primary : theme.border },
                ]}
              />
            ))}
          </View>

          <View testID="onboarding-actions" style={styles.actions}>
            <AppButton
              label="Back"
              disabled={index === 0}
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
            />
            <AppButton
              label={final ? 'Get started' : 'Next'}
              variant="primary"
              isLoading={final && !replayReturnPath && grants.isPending}
              disabled={final && !replayReturnPath && !grants.data?.length}
              onPress={() => {
                if (!final) {
                  setIndex((current) => current + 1);
                  return;
                }
                finish();
              }}
            />
          </View>

          {(grants.isError || (!grants.isPending && !grants.data?.length)) && (
            <EmptyStateLayout
              title={grants.isError ? 'Instrument fault' : 'No opportunities found'}
              description={
                grants.error?.message ?? 'There are no matching opportunities available.'
              }
              ctaLabel="Try again"
              onCtaPress={() => {
                void grants.refetch();
              }}
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
    width: '100%',
    maxWidth: LAYOUT.onboardingMaxWidth,
    alignSelf: 'center',
  },
  card: {
    padding: SPACING['4xl'],
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    gap: SPACING['2xl'],
  },
  mobileCard: { padding: SPACING.xl, gap: SPACING.xl },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: LAYOUT.minTouchTarget,
    gap: SPACING.sm,
  },
  brandIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  skipSlot: {
    minHeight: LAYOUT.minTouchTarget,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -SPACING.sm,
  },
  skipButton: {
    paddingHorizontal: SPACING.sm,
    flexShrink: 0,
  },
  slideStageContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  slideCopy: {
    gap: SPACING.lg,
  },
  steps: { flexDirection: 'row', gap: SPACING.sm },
  step: { height: SPACING.xs, flex: 1, borderRadius: RADIUS.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
});
