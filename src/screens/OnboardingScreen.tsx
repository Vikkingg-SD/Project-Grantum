import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { useGrants } from '@/api/hooks/useGrants';
import { useDraftStore } from '@/store/useDraftStore';
import { useTheme } from '@/hooks/useTheme';
import { LAYOUT } from '@/config/layout';
import { RADIUS, SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';

const slides = [
  {
    title: 'Discover funders that match your project.',
    body: 'Grantum scores opportunities against your mission, geography, budget, and eligibility profile.',
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
  const { mobile } = useLayoutMetrics();
  const router = useRouter();
  const grants = useGrants();
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const slide = slides[index];
  const final = index === slides.length - 1;
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View
          style={[
            styles.card,
            mobile && styles.mobileCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.brandRow}>
            <AppText variant="h2">Grantum</AppText>
            <AppText variant="metric-sm" color="primary">
              {String(index + 1).padStart(2, '0')} / 03
            </AppText>
          </View>
          <AppText variant="display">{slide.title}</AppText>
          <AppText>{slide.body}</AppText>
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
          <View style={styles.actions}>
            <AppButton
              label="Back"
              disabled={index === 0}
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
            />
            <AppButton
              label={final ? 'Get started' : 'Next'}
              variant="primary"
              isLoading={final && grants.isPending}
              disabled={final && !grants.data?.length}
              onPress={() => {
                if (!final) {
                  setIndex((current) => current + 1);
                  return;
                }
                const grant = grants.data?.[0];
                if (!grant) return;
                ensureDraft(grant.id);
                // Onboarding navigates directly, outside instrument history/context.
                router.push({
                  pathname: '/grants/[grantID]/dashboard',
                  params: { grantID: grant.id },
                });
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
  card: { padding: SPACING['4xl'], borderWidth: 1, borderRadius: RADIUS.lg, gap: SPACING['2xl'] },
  mobileCard: { padding: SPACING.xl },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  steps: { flexDirection: 'row', gap: SPACING.sm },
  step: { height: SPACING.xs, flex: 1, borderRadius: RADIUS.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
});
