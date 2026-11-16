import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { InfoCard } from '@/components/molecules/InfoCard';
import { RADIUS, SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  AFFILIATE_PROGRAM,
  BILLING_REGIONS,
  BUSINESS_MODEL_PILLARS,
  evaluateAffiliateEligibility,
  formatUsdPrice,
  REFERRAL_PROGRAM,
  SUBSCRIPTION_TIERS,
  UNIT_ECONOMICS_METRICS,
  type AffiliateTierChoice,
  type BillingRegion,
} from '@/utils/plans';

const INVITE_PRESETS = [0, 3, 5, 8] as const;
const TIER_CHOICES: readonly { id: AffiliateTierChoice; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 't1', label: 'Tier 1' },
  { id: 't2', label: 'Tier 2' },
  { id: 't3', label: 'Tier 3' },
];
const MONTH_PRESETS = [0, 1, 2, 6] as const;

export default function PlansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [region, setRegion] = useState<BillingRegion>('cis');
  const [invitedCount, setInvitedCount] = useState<number>(5);
  const [currentTier, setCurrentTier] = useState<AffiliateTierChoice>('t3');
  const [subscribedMonths, setSubscribedMonths] = useState<number>(2);

  const regionLabel = BILLING_REGIONS.find((r) => r.id === region)?.label ?? 'CIS (СНГ)';
  const affiliateStatus = useMemo(
    () => evaluateAffiliateEligibility({ invitedCount, currentTier, subscribedMonths }),
    [currentTier, invitedCount, subscribedMonths]
  );

  return (
    <ScreenContainer>
      <View style={styles.page}>
        <AppText variant="h1">Subscriptions, regional pricing &amp; token economics</AppText>
        <AppText color="muted">
          Proposed B2B2C subscription tiers, GT referral mechanics, lifetime affiliate rules, and
          platform unit economics. Checkout, token enforcement, and USDT payouts are not connected
          in this sample preview.
        </AppText>

        <InfoCard tone="surface">
          <AppText variant="label" align="center">
            Billing region stays separate from opportunity eligibility
          </AppText>
          <AppText variant="caption" color="muted" align="center">
            {BUSINESS_MODEL_PILLARS.pppNote}
          </AppText>
        </InfoCard>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h2">Proposed PPP subscription tiers</AppText>
            <StatusBadge label={`Region: ${regionLabel}`} variant="brand" />
          </View>
          <AppText variant="caption" color="muted">
            Select a Purchasing Power Parity (PPP) billing region to inspect monthly pricing across
            Tier 1, Tier 2, and Tier 3:
          </AppText>
          <View style={styles.rowWrap}>
            {BILLING_REGIONS.map((item) => (
              <AppButton
                key={item.id}
                size="sm"
                variant={region === item.id ? 'primary' : 'outline'}
                label={item.label}
                selected={region === item.id}
                onPress={() => setRegion(item.id)}
              />
            ))}
          </View>

          {SUBSCRIPTION_TIERS.map((tier) => (
            <View key={tier.id} style={[styles.section, { borderTopColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <AppText variant="h3">{tier.name}</AppText>
                <AppText variant="metric-md" color="primary">
                  {formatUsdPrice(tier.prices[region])} / mo
                </AppText>
              </View>
              <AppText variant="caption" color="muted">
                {tier.subtitle}
              </AppText>
              <AppText variant="caption" color="muted">
                PPP table: CIS {formatUsdPrice(tier.prices.cis)} · East Europe{' '}
                {formatUsdPrice(tier.prices['east-europe'])} · Global{' '}
                {formatUsdPrice(tier.prices.global)}
              </AppText>
              <AppText variant="caption">AI &amp; limits: {tier.aiModels}</AppText>
              <AppText variant="caption">Notes &amp; sharing: {tier.notesMode}</AppText>
              {tier.highlights.map((bullet) => (
                <AppText key={bullet} variant="caption" color="muted">
                  • {bullet}
                </AppText>
              ))}
              {tier.enterpriseNote ? (
                <AppText variant="caption" color="pending">
                  {tier.enterpriseNote}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h2">{REFERRAL_PROGRAM.headline}</AppText>
            <StatusBadge label="700 GT / 300 GT" variant="gold" />
          </View>
          <AppText>{REFERRAL_PROGRAM.summary}</AppText>
          <View style={[styles.section, { borderTopColor: theme.border }]}>
            <AppText variant="label">Retention, splitting &amp; team pooling rule</AppText>
            <AppText variant="caption" color="muted">
              {REFERRAL_PROGRAM.retentionRules}
            </AppText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h2">{AFFILIATE_PROGRAM.headline}</AppText>
            <StatusBadge label={AFFILIATE_PROGRAM.ratesLabel} variant="verified" />
          </View>
          <AppText>{AFFILIATE_PROGRAM.audience}</AppText>
          <AppText variant="caption" color="muted">
            {AFFILIATE_PROGRAM.payoutMethod}
          </AppText>
          <AppText variant="caption" color="muted">
            {AFFILIATE_PROGRAM.eligibilitySummary}
          </AppText>

          <View style={[styles.section, { borderTopColor: theme.border }]}>
            <View style={styles.rowBetween}>
              <AppText variant="label">Affiliate eligibility simulator (sample check)</AppText>
              <StatusBadge
                label={affiliateStatus.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                variant={affiliateStatus.eligible ? 'verified' : 'pending'}
              />
            </View>
            <AppText variant="caption" color="muted">
              Invited users:
            </AppText>
            <View style={styles.rowWrap}>
              {INVITE_PRESETS.map((count) => (
                <AppButton
                  key={count}
                  size="sm"
                  variant={invitedCount === count ? 'primary' : 'outline'}
                  label={`${count} invited`}
                  accessibilityLabel={`Affiliate invited count: ${count}`}
                  selected={invitedCount === count}
                  onPress={() => setInvitedCount(count)}
                />
              ))}
            </View>
            <AppText variant="caption" color="muted">
              Current tier:
            </AppText>
            <View style={styles.rowWrap}>
              {TIER_CHOICES.map((choice) => (
                <AppButton
                  key={choice.id}
                  size="sm"
                  variant={currentTier === choice.id ? 'primary' : 'outline'}
                  label={choice.label}
                  accessibilityLabel={`Affiliate tier: ${choice.label}`}
                  selected={currentTier === choice.id}
                  onPress={() => setCurrentTier(choice.id)}
                />
              ))}
            </View>
            <AppText variant="caption" color="muted">
              Subscribed duration:
            </AppText>
            <View style={styles.rowWrap}>
              {MONTH_PRESETS.map((months) => (
                <AppButton
                  key={months}
                  size="sm"
                  variant={subscribedMonths === months ? 'primary' : 'outline'}
                  label={`${months} mo`}
                  accessibilityLabel={`Affiliate subscribed months: ${months}`}
                  selected={subscribedMonths === months}
                  onPress={() => setSubscribedMonths(months)}
                />
              ))}
            </View>
            <AppText color={affiliateStatus.eligible ? 'verified' : 'failureText'}>
              {affiliateStatus.summary}
            </AppText>
            {affiliateStatus.missingReasons.map((reason) => (
              <AppText key={reason} variant="caption" color="muted">
                • {reason}
              </AppText>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h2">B2B2C business model &amp; unit economics</AppText>
          <AppText variant="caption" color="muted">
            Segments: {BUSINESS_MODEL_PILLARS.segments.join(' · ')}
          </AppText>
          <AppText variant="caption" color="muted">
            Revenue model: {BUSINESS_MODEL_PILLARS.offerings.join(' · ')}
          </AppText>
          <View style={[styles.section, { borderTopColor: theme.border }]}>
            <AppText variant="label">Reference unit economics (break-even = 54 users)</AppText>
            <View style={styles.metricsGrid}>
              {UNIT_ECONOMICS_METRICS.map((metric) => (
                <View
                  key={metric.label}
                  style={[styles.metricTile, { backgroundColor: theme.subtle }]}
                >
                  <AppText variant="caption" color="muted">
                    {metric.label}
                  </AppText>
                  <AppText variant="metric-sm">{metric.value}</AppText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.rowWrap}>
          <AppButton
            label="Back to workspace"
            variant="primary"
            onPress={() => router.push('/dashboard')}
          />
          <AppButton
            label="Open public roadmap"
            variant="outline"
            onPress={() => router.push('/roadmap')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACING.lg, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
});
