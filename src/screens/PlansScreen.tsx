import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Globe from 'lucide-react-native/icons/globe';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Users from 'lucide-react-native/icons/users';
import Zap from 'lucide-react-native/icons/zap';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { InfoCard } from '@/components/molecules/InfoCard';
import { ENV } from '@/config/env';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useTheme } from '@/hooks/useTheme';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { returnToWorkspace, workspaceReturnHref } from '@/utils/workspaceReturn';
import {
  ADDITIONAL_BILLING_REGIONS,
  BILLING_REGIONS,
  getBillingRegionInfo,
  isCalibratedBillingRegion,
  PPP_ELIGIBILITY_NOTE,
  resolveExternalBillingUrl,
  resolveTierRegionPricing,
  SUBSCRIPTION_TIERS,
  type BillingRegionId,
  type SubscriptionTierId,
} from '@/utils/plans';

function renderTierIcon(tierId: SubscriptionTierId, color: string) {
  switch (tierId) {
    case 't2':
      return <Zap size={20} color={color} />;
    case 't3':
      return <Users size={20} color={color} />;
    case 't1':
    default:
      return <Sparkles size={20} color={color} />;
  }
}

export default function PlansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { desktop } = useLayoutMetrics();
  const { canGoBack, previousHref, goBack } = useWorkspaceNavigation();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const externalBillingUrl = resolveExternalBillingUrl(ENV.BILLING_PORTAL_URL);

  const [regionId, setRegionId] = useState<BillingRegionId>('cis');
  const [selectedTierId, setSelectedTierId] = useState<SubscriptionTierId | null>('t2');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState('');
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalNotice, setPortalNotice] = useState('');

  const portalToken = useRef(0);
  const dropdownRef = useRef<View>(null);
  const triggerSlotRef = useRef<View>(null);

  useEffect(() => {
    return () => {
      portalToken.current += 1;
    };
  }, []);

  const focusDropdownTrigger = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const slot = triggerSlotRef.current as unknown as HTMLElement | null;
    slot?.querySelector<HTMLElement>('button, [role="button"]')?.focus();
  }, []);

  const dismissDropdown = useCallback(() => {
    setDropdownOpen(false);
    setRegionFilter('');
    focusDropdownTrigger();
  }, [focusDropdownTrigger]);

  useEscapeDismiss(dropdownOpen, dismissDropdown);

  useEffect(() => {
    if (!dropdownOpen || Platform.OS !== 'web') return;
    const onPointerDown = (event: MouseEvent) => {
      const container = dropdownRef.current as unknown as HTMLElement | null;
      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setDropdownOpen(false);
        setRegionFilter('');
      }
    };
    window.addEventListener('mousedown', onPointerDown, true);
    return () => window.removeEventListener('mousedown', onPointerDown, true);
  }, [dropdownOpen]);

  const regionInfo = useMemo(() => getBillingRegionInfo(regionId), [regionId]);
  const isCalibrated = isCalibratedBillingRegion(regionId);
  const isAdditionalRegion = !isCalibrated;

  const filteredAdditionalRegions = useMemo(() => {
    const query = regionFilter.trim().toLowerCase();
    if (!query) return ADDITIONAL_BILLING_REGIONS;
    return ADDITIONAL_BILLING_REGIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.shortLabel.toLowerCase().includes(query)
    );
  }, [regionFilter]);

  const selectedTier = useMemo(
    () => SUBSCRIPTION_TIERS.find((item) => item.id === selectedTierId) ?? null,
    [selectedTierId]
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

  const handleOpenAffiliateCampaign = () => {
    router.push(workspaceReturnHref('/affiliate-campaign', returnTo));
  };

  const handleOpenExternalBilling = async () => {
    if (!externalBillingUrl || openingPortal) return;
    const token = ++portalToken.current;
    setOpeningPortal(true);
    setPortalNotice('');
    try {
      await Linking.openURL(externalBillingUrl);
      if (portalToken.current === token) {
        setPortalNotice('Opened subscription billing in your browser.');
      }
    } catch {
      if (portalToken.current === token) {
        setPortalNotice(
          'Could not open the external billing page. Visit it directly in a browser.'
        );
      }
    } finally {
      if (portalToken.current === token) {
        setOpeningPortal(false);
      }
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <ScreenContainer insetEdges={[]}>
        <View style={styles.page}>
          <AppText variant="h1">Subscriptions | Regional Pricing</AppText>
          <View
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <AppText variant="h2">Manage your plan on the web</AppText>
            <AppText color="muted">
              Grantum subscriptions and regional pricing are managed outside the mobile app on the
              Grantum web portal. In-app purchases are not offered on iOS or Android.
            </AppText>
            {externalBillingUrl ? (
              <AppButton
                label="Open web billing portal"
                variant="primary"
                isLoading={openingPortal}
                onPress={() => {
                  void handleOpenExternalBilling();
                }}
              />
            ) : (
              <AppText variant="caption" color="muted">
                Web billing checkout opens in your browser once billing services connect.
              </AppText>
            )}
            {portalNotice ? (
              <AppText accessibilityLiveRegion="polite" variant="caption" color="muted">
                {portalNotice}
              </AppText>
            ) : null}
          </View>
          <View style={styles.rowWrap}>
            <AppButton
              label="Back to workspace"
              variant="primary"
              onPress={handleReturnToWorkspace}
            />
            <AppButton
              label="Affiliate campaign"
              variant="outline"
              onPress={handleOpenAffiliateCampaign}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.page}>
        <View style={styles.headerBlock}>
          <AppText variant="h1">Subscriptions | Regional Pricing</AppText>
        </View>

        <View
          ref={dropdownRef}
          testID="billing-region-selector"
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.titleWithIcon}>
              <Globe size={18} color={theme.primaryText} />
              <AppText variant="label">Billing region</AppText>
            </View>
            <View style={styles.badgeWrap}>
              <StatusBadge
                testID="active-region-badge"
                label={`Region: ${regionInfo.label}`}
                variant="brand"
              />
              {!isCalibrated ? (
                <StatusBadge label="PPP rate pending recalibration" variant="pending" />
              ) : null}
            </View>
          </View>

          <View style={styles.rowWrap}>
            {BILLING_REGIONS.map((item) => (
              <AppButton
                key={item.id}
                size="sm"
                variant={regionId === item.id ? 'primary' : 'outline'}
                label={item.label}
                selected={regionId === item.id}
                onPress={() => {
                  setRegionId(item.id);
                  setDropdownOpen(false);
                  setRegionFilter('');
                }}
              />
            ))}
            <View ref={triggerSlotRef} collapsable={false}>
              <AppButton
                size="sm"
                variant="outline"
                selected={isAdditionalRegion}
                expanded={dropdownOpen}
                label={
                  isAdditionalRegion ? `More regions: ${regionInfo.shortLabel}` : 'More regions'
                }
                accessibilityLabel={
                  isAdditionalRegion
                    ? regionInfo.shortLabel === regionInfo.label
                      ? `More regions: ${regionInfo.label}`
                      : `More regions: ${regionInfo.shortLabel} — ${regionInfo.label}`
                    : 'More regions'
                }
                iconPosition="right"
                icon={
                  dropdownOpen ? (
                    <ChevronUp size={16} color={theme.textMain} />
                  ) : (
                    <ChevronDown size={16} color={theme.textMain} />
                  )
                }
                onPress={() => {
                  if (dropdownOpen) setRegionFilter('');
                  setDropdownOpen((prev) => !prev);
                }}
              />
            </View>
          </View>

          {dropdownOpen ? (
            <View
              testID="more-regions-menu"
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: theme.subtle,
                  borderTopColor: theme.border,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <AppInput
                accessibilityLabel="Filter billing regions"
                placeholder="Search world regions..."
                value={regionFilter}
                onChangeText={setRegionFilter}
              />
              {filteredAdditionalRegions.length === 0 ? (
                <AppText variant="caption" color="muted">
                  No matching regions.
                </AppText>
              ) : (
                <View style={styles.dropdownOptionsGrid}>
                  {filteredAdditionalRegions.map((item) => {
                    const selected = regionId === item.id;
                    return (
                      <AppButton
                        key={item.id}
                        size="sm"
                        variant={selected ? 'primary' : 'ghost'}
                        selected={selected}
                        label={item.label}
                        style={styles.dropdownOptionButton}
                        onPress={() => {
                          setRegionId(item.id);
                          setDropdownOpen(false);
                          setRegionFilter('');
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View
          testID="subscription-offers-grid"
          style={[styles.offersGrid, desktop && styles.offersGridDesktop]}
        >
          {SUBSCRIPTION_TIERS.map((tier) => {
            const pricing = resolveTierRegionPricing(tier, regionId);
            const isSelected = selectedTierId === tier.id;
            const showSelected = isSelected && pricing.calibrated;
            const isFeatured = tier.id === 't2';
            const heroBg = showSelected
              ? withAlpha(theme.primary, 0.14)
              : isFeatured
                ? withAlpha(theme.primary, 0.08)
                : theme.subtle;
            const iconColor =
              tier.id === 't3'
                ? theme.goldText
                : tier.id === 't2'
                  ? theme.primaryText
                  : theme.textMain;
            const selectLabel = showSelected ? `Selected: ${tier.name}` : tier.ctaLabel;
            return (
              <View
                key={tier.id}
                testID={`offer-card-${tier.id}`}
                style={[
                  styles.offerCard,
                  desktop && styles.offerCardDesktop,
                  {
                    backgroundColor: theme.surface,
                    borderColor: showSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.offerBanner,
                    { backgroundColor: heroBg, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <StatusBadge
                      label={tier.offerTag}
                      variant={tier.id === 't2' ? 'brand' : tier.id === 't3' ? 'gold' : 'neutral'}
                    />
                    {renderTierIcon(tier.id, iconColor)}
                  </View>
                  <AppText variant="h2">{tier.name}</AppText>
                  <AppText variant="caption" color="muted">
                    {tier.subtitle}
                  </AppText>
                  <View style={styles.priceRow}>
                    {pricing.calibrated ? (
                      <>
                        <AppText
                          testID={`tier-price-${tier.id}`}
                          variant="metric-xl"
                          color="primary"
                        >
                          {pricing.priceLabel}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {pricing.periodLabel} · {regionInfo.shortLabel}
                        </AppText>
                      </>
                    ) : (
                      <View style={styles.pendingPriceBlock}>
                        <AppText
                          testID={`tier-price-${tier.id}`}
                          variant="metric-md"
                          color="pending"
                        >
                          {pricing.priceLabel}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {pricing.statusNote}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  testID={`offer-body-${tier.id}`}
                  style={[styles.offerBody, desktop && styles.offerBodyDesktop]}
                >
                  <View
                    style={[
                      styles.capabilityTile,
                      desktop && styles.capabilityTileDesktop,
                      { backgroundColor: theme.subtle },
                    ]}
                  >
                    <AppText variant="caption" color="muted">
                      Workspace &amp; notes
                    </AppText>
                    <AppText variant="caption">{tier.notesMode}</AppText>
                  </View>

                  <View
                    style={[
                      styles.capabilityTile,
                      desktop && styles.capabilityTileDesktop,
                      { backgroundColor: theme.subtle },
                    ]}
                  >
                    <AppText variant="caption" color="muted">
                      AI &amp; usage
                    </AppText>
                    <AppText variant="caption">{tier.aiModels}</AppText>
                  </View>

                  <View style={styles.highlightsList}>
                    {tier.highlights.map((bullet) => (
                      <View key={bullet} style={styles.highlightRow}>
                        <CheckCircle2
                          size={16}
                          color={theme.verifiedText}
                          style={styles.highlightIcon}
                        />
                        <AppText variant="caption" style={styles.highlightText}>
                          {bullet}
                        </AppText>
                      </View>
                    ))}
                  </View>

                  {tier.enterpriseNote ? (
                    <AppText variant="caption" color="pending">
                      {tier.enterpriseNote}
                    </AppText>
                  ) : null}
                </View>

                <View testID={`offer-footer-${tier.id}`} style={styles.offerFooter}>
                  <AppButton
                    label={pricing.calibrated ? selectLabel : 'Rate pending recalibration'}
                    accessibilityLabel={
                      pricing.calibrated
                        ? `${selectLabel} · ${pricing.priceLabel} ${pricing.periodLabel}`
                        : `Rate pending recalibration for ${tier.name}`
                    }
                    variant={isSelected && pricing.calibrated ? 'primary' : 'outline'}
                    selected={isSelected && pricing.calibrated}
                    disabled={!pricing.calibrated}
                    onPress={() => setSelectedTierId(tier.id)}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {selectedTier && isCalibrated ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.statusStrip, { backgroundColor: theme.subtle }]}
          >
            <AppText variant="caption">
              Selected {selectedTier.name} (
              {resolveTierRegionPricing(selectedTier, regionId).priceLabel} / mo ·{' '}
              {regionInfo.label}).{' '}
              {externalBillingUrl
                ? 'Continue to hosted web checkout below.'
                : 'Checkout activates once billing services connect.'}
            </AppText>
          </View>
        ) : null}

        {externalBillingUrl ? (
          <View style={styles.rowWrap}>
            <AppButton
              label="Open web billing portal"
              variant="primary"
              disabled={!isCalibrated}
              isLoading={openingPortal}
              onPress={() => {
                void handleOpenExternalBilling();
              }}
            />
            {portalNotice ? (
              <AppText accessibilityLiveRegion="polite" variant="caption" color="muted">
                {portalNotice}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View testID="billing-eligibility-note">
          <InfoCard tone="surface">
            <AppText variant="label" align="center">
              Billing region stays separate from opportunity eligibility
            </AppText>
            <AppText variant="caption" color="muted" align="center">
              {PPP_ELIGIBILITY_NOTE}
            </AppText>
          </InfoCard>
        </View>

        <View style={styles.rowWrap}>
          <AppButton
            label="Back to workspace"
            variant="primary"
            onPress={handleReturnToWorkspace}
          />
          <AppButton
            label="Affiliate campaign"
            variant="outline"
            onPress={handleOpenAffiliateCampaign}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACING.lg, width: '100%', maxWidth: 1180, alignSelf: 'center' },
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
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  dropdownMenu: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  dropdownOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  dropdownOptionButton: {
    justifyContent: 'flex-start',
  },
  offersGrid: {
    flexDirection: 'column',
    gap: SPACING.md,
  },
  offersGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  offerCard: {
    width: '100%',
    minWidth: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  offerCardDesktop: {
    flex: 1,
    justifyContent: 'space-between',
  },
  offerBanner: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  pendingPriceBlock: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    gap: 2,
  },
  offerBody: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  offerBodyDesktop: {
    flexGrow: 1,
    flexShrink: 0,
  },
  capabilityTile: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  capabilityTileDesktop: {
    minHeight: 112,
  },
  highlightsList: {
    gap: SPACING.xs,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  highlightIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  highlightText: {
    flex: 1,
    minWidth: 0,
  },
  offerFooter: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  statusStrip: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
});
