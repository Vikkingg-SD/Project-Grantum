import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Gift from 'lucide-react-native/icons/gift';
import Award from 'lucide-react-native/icons/award';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ENV } from '@/config/env';
import { useTheme } from '@/hooks/useTheme';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { RADIUS, SPACING } from '@/config/theme';
import { returnToWorkspace, workspaceReturnHref } from '@/utils/workspaceReturn';
import {
  AFFILIATE_PROGRAM,
  computeReferralLedger,
  evaluateAffiliateEligibility,
  formatGtCount,
  getReferralEventsForDataSource,
  REFERRAL_PROGRAM,
  type AffiliateTierChoice,
} from '@/utils/plans';

const INVITE_PRESETS = [0, 3, 5, 8] as const;
const TIER_CHOICES: readonly { id: AffiliateTierChoice; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 't1', label: 'Tier 1' },
  { id: 't2', label: 'Tier 2' },
  { id: 't3', label: 'Tier 3' },
];
const MONTH_PRESETS = [0, 1, 2, 6] as const;

export default function AffiliateCampaignScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { canGoBack, previousHref, goBack } = useWorkspaceNavigation();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();

  const accountEvents = useMemo(() => getReferralEventsForDataSource(ENV.DATA_SOURCE), []);
  const [invitedCount, setInvitedCount] = useState<number>(
    () => accountEvents.filter((event) => event.status === 'verified-active').length
  );
  const [currentTier, setCurrentTier] = useState<AffiliateTierChoice>(() =>
    accountEvents.length > 0 ? 't3' : 'free'
  );
  const [subscribedMonths, setSubscribedMonths] = useState<number>(() =>
    accountEvents.length > 0 ? 2 : 0
  );

  const ledger = useMemo(
    () => computeReferralLedger(accountEvents, currentTier),
    [accountEvents, currentTier]
  );
  const affiliateStatus = useMemo(
    () => evaluateAffiliateEligibility({ invitedCount, currentTier, subscribedMonths }),
    [currentTier, invitedCount, subscribedMonths]
  );

  const handleReturnToWorkspace = () => {
    returnToWorkspace({
      returnTo,
      canGoBack,
      previousHref,
      goBack,
      replace: (href) => router.replace(href),
    });
  };

  const handleOpenPlans = () => {
    router.push(workspaceReturnHref('/plans', returnTo));
  };

  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.page}>
        <View style={styles.headerBlock}>
          <AppText variant="h1">Affiliate campaign</AppText>
          <AppText color="muted">
            Two-sided GT referral rewards, invite token bonuses, and lifetime USDT affiliate
            commissions.
          </AppText>
        </View>

        <View
          testID="referral-ledger-card"
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.titleWithIcon}>
              <View style={styles.iconBox}>
                <Gift size={20} color={theme.goldText} />
              </View>
              <AppText variant="h2" style={styles.titleText}>
                Referral reward ledger
              </AppText>
            </View>
            <StatusBadge
              label={accountEvents.length > 0 ? 'Account events' : 'Awaiting sync'}
              variant="brand"
            />
          </View>

          <View style={styles.ledgerGrid}>
            <View
              testID="referral-earned-tile"
              style={[styles.ledgerTile, { backgroundColor: theme.subtle }]}
            >
              <AppText variant="caption" color="muted">
                Earned
              </AppText>
              <AppText variant="metric-lg" color="verified">
                {formatGtCount(ledger.earnedGt)} GT
              </AppText>
              <AppText variant="caption" color="muted">
                {ledger.verifiedInvites} verified invites ·{' '}
                {formatGtCount(ledger.inviteeDistributedGt)} GT sent to friends
              </AppText>
            </View>

            <View
              testID="referral-pending-tile"
              style={[styles.ledgerTile, { backgroundColor: theme.subtle }]}
            >
              <AppText variant="caption" color="muted">
                Pending
              </AppText>
              <AppText variant="metric-lg" color="pending">
                {formatGtCount(ledger.pendingGt)} GT
              </AppText>
              <AppText variant="caption" color="muted">
                {ledger.pendingInvites} pending invites awaiting activation
              </AppText>
            </View>

            <View
              testID="referral-eligible-tile"
              style={[styles.ledgerTile, { backgroundColor: theme.subtle }]}
            >
              <AppText variant="caption" color="muted">
                Eligible
              </AppText>
              <StatusBadge
                label={affiliateStatus.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                variant={affiliateStatus.eligible ? 'verified' : 'pending'}
              />
              <AppText variant="caption" color="muted">
                {affiliateStatus.eligible
                  ? `${ledger.commissionRateLabel} tier payout unlocked`
                  : (affiliateStatus.missingReasons[0] ?? 'Check eligibility criteria below')}
              </AppText>
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: theme.border }]}>
            <AppText variant="label">Account invite history</AppText>
            {accountEvents.length === 0 ? (
              <AppText variant="caption" color="muted">
                Referral ledger events appear once connected billing services sync.
              </AppText>
            ) : (
              accountEvents.map((event) => (
                <View key={event.id} style={[styles.eventRow, { borderTopColor: theme.border }]}>
                  <View style={styles.eventMeta}>
                    <AppText variant="caption">{event.label}</AppText>
                    <AppText variant="caption" color="muted">
                      {event.dateLabel} · +{event.inviterGt} GT inviter / +{event.inviteeGt} GT
                      friend
                    </AppText>
                  </View>
                  <StatusBadge
                    label={event.status === 'verified-active' ? 'VERIFIED' : 'PENDING'}
                    variant={event.status === 'verified-active' ? 'verified' : 'pending'}
                  />
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h2">{REFERRAL_PROGRAM.headline}</AppText>
            <StatusBadge label="700 GT / 300 GT" variant="gold" />
          </View>
          <AppText>{REFERRAL_PROGRAM.summary}</AppText>
          <View style={[styles.calloutBox, { backgroundColor: theme.subtle }]}>
            <AppText variant="label">Retention, splitting &amp; team pooling rule</AppText>
            <AppText variant="caption" color="muted">
              {REFERRAL_PROGRAM.retentionRules}
            </AppText>
            <View style={styles.rowWrap}>
              <StatusBadge
                label={
                  ledger.canSplitCredits
                    ? 'Splitting unlocked (Tier 2+)'
                    : 'Splitting locked (< Tier 2)'
                }
                variant={ledger.canSplitCredits ? 'verified' : 'neutral'}
              />
              <StatusBadge
                label={
                  ledger.canPoolCredits
                    ? 'Team pooling unlocked (Tier 3)'
                    : 'Team pooling locked (< Tier 3)'
                }
                variant={ledger.canPoolCredits ? 'verified' : 'neutral'}
              />
            </View>
          </View>
        </View>

        <View
          testID="affiliate-calculator-card"
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.titleWithIcon}>
              <View style={styles.iconBox}>
                <Award size={20} color={theme.verifiedText} />
              </View>
              <AppText variant="h2" style={styles.titleText}>
                {AFFILIATE_PROGRAM.headline}
              </AppText>
            </View>
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
              <AppText variant="label">Affiliate eligibility calculator</AppText>
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
                  accessibilityLabel={`${count} invited · Affiliate invited count`}
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
                  accessibilityLabel={`${choice.label} · Affiliate tier`}
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
                  accessibilityLabel={`${months} mo · Affiliate subscribed months`}
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

        <View style={styles.rowWrap}>
          <AppButton
            label="Back to workspace"
            variant="primary"
            onPress={handleReturnToWorkspace}
          />
          <AppButton label="Subscriptions & plans" variant="outline" onPress={handleOpenPlans} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACING.lg, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  headerBlock: { gap: SPACING.xs },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 180,
  },
  iconBox: {
    flexShrink: 0,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
  },
  ledgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  ledgerTile: {
    flexGrow: 1,
    flexBasis: 200,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  eventRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  eventMeta: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  calloutBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
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
});
