import {
  ADDITIONAL_BILLING_REGIONS,
  AFFILIATE_ACCOUNT_EVENTS,
  AFFILIATE_PROGRAM,
  BILLING_REGIONS,
  computeReferralLedger,
  evaluateAffiliateEligibility,
  formatUsdPrice,
  getBillingRegionInfo,
  getReferralEventsForDataSource,
  PPP_ELIGIBILITY_NOTE,
  REFERRAL_PROGRAM,
  resolveExternalBillingUrl,
  resolveTierRegionPricing,
  SUBSCRIPTION_TIERS,
} from '../src/utils/plans';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

function main() {
  const [t1, t2, t3] = SUBSCRIPTION_TIERS;
  check(
    'Given PPP subscription tiers When checking CIS, Eastern Europe, and Global pricing Then exact blueprint figures match',
    t1.prices.cis === 9.99 &&
      t1.prices['east-europe'] === 14.99 &&
      t1.prices.global === 19.99 &&
      t2.prices.cis === 19.99 &&
      t2.prices['east-europe'] === 29.99 &&
      t2.prices.global === 49.99 &&
      t3.prices.cis === 44.99 &&
      t3.prices['east-europe'] === 69.99 &&
      t3.prices.global === 99.99 &&
      formatUsdPrice(t3.prices.global) === '$99.99'
  );

  check(
    'Given world regions beyond shortcut buttons When checking tier pricing Then calibrated regions resolve USD and unmapped regions surface pending recalibration without fallback charge',
    BILLING_REGIONS.length === 3 &&
      ADDITIONAL_BILLING_REGIONS.length >= 9 &&
      resolveTierRegionPricing(t1, 'cis').priceLabel === '$9.99' &&
      resolveTierRegionPricing(t2, 'east-europe').priceLabel === '$29.99' &&
      resolveTierRegionPricing(t3, 'global').priceLabel === '$99.99' &&
      ADDITIONAL_BILLING_REGIONS.every((region) => {
        const res = resolveTierRegionPricing(t1, region.id);
        return !res.calibrated && res.amountUsd === null && res.priceLabel === 'PPP rate pending';
      }) &&
      PPP_ELIGIBILITY_NOTE.includes('strictly independent')
  );

  check(
    'Given tier feature descriptions When inspected Then vendor names stay absent and requested notes/co-working descriptions match',
    t1.notesMode === 'Notes' &&
      t2.notesMode === 'Sharable notes' &&
      t3.notesMode ===
        'Collaborative Co-working Space + notes & drafts with multi-user editing and work history' &&
      SUBSCRIPTION_TIERS.every((tier) => {
        const text = [
          tier.name,
          tier.subtitle,
          tier.aiModels,
          tier.notesMode,
          ...tier.highlights,
        ].join(' ');
        return !/samsung|discord/i.test(text);
      })
  );

  const ledger = computeReferralLedger(AFFILIATE_ACCOUNT_EVENTS, 't3');
  check(
    'Given bilateral referral and account events When computing ledger Then earned, pending, and tier permissions derive accurately',
    REFERRAL_PROGRAM.inviterRewardGt === 700 &&
      REFERRAL_PROGRAM.inviteeRewardGt === 300 &&
      AFFILIATE_PROGRAM.ratesLabel === '10% | 15% | 25%' &&
      ledger.verifiedInvites === 5 &&
      ledger.pendingInvites === 2 &&
      ledger.earnedGt === 3500 &&
      ledger.pendingGt === 1400 &&
      ledger.canSplitCredits &&
      ledger.canPoolCredits &&
      !computeReferralLedger(AFFILIATE_ACCOUNT_EVENTS, 't1').canSplitCredits
  );

  const tooFewInvites = evaluateAffiliateEligibility({
    invitedCount: 4,
    currentTier: 't3',
    subscribedMonths: 6,
  });
  check(
    'Given active T3 subscriber with fewer than 5 invites When checking affiliate eligibility Then not eligible',
    !tooFewInvites.eligible && tooFewInvites.missingReasons.length === 1
  );

  const shortPaid = evaluateAffiliateEligibility({
    invitedCount: 5,
    currentTier: 't2',
    subscribedMonths: 1,
  });
  check(
    'Given T2 subscriber with 5 invites but only 1 month tenure When checking affiliate eligibility Then not eligible',
    !shortPaid.eligible && shortPaid.missingReasons.length === 1
  );

  const eligibleT3 = evaluateAffiliateEligibility({
    invitedCount: 5,
    currentTier: 't3',
    subscribedMonths: 0,
  });
  const eligibleT1 = evaluateAffiliateEligibility({
    invitedCount: 5,
    currentTier: 't1',
    subscribedMonths: 2,
  });
  check(
    'Given >=5 invites with active T3 or >=2 months on T1/T2 When checking affiliate eligibility Then eligible and non-finite inputs + api ledger fail closed',
    eligibleT3.eligible &&
      eligibleT1.eligible &&
      !evaluateAffiliateEligibility({
        invitedCount: Number.NaN,
        currentTier: 't3',
        subscribedMonths: 2,
      }).eligible &&
      !getBillingRegionInfo('unknown-region').calibrated &&
      getReferralEventsForDataSource('api').length === 0 &&
      getReferralEventsForDataSource('mock').length === AFFILIATE_ACCOUNT_EVENTS.length
  );

  check(
    'Given external billing portal URLs When resolved Then only credential-free HTTPS URLs are accepted',
    resolveExternalBillingUrl('https://billing.grantum.app/plans') ===
      'https://billing.grantum.app/plans' &&
      resolveExternalBillingUrl('http://billing.grantum.app/plans') === null &&
      resolveExternalBillingUrl('javascript:alert(1)') === null &&
      resolveExternalBillingUrl('https://user:pass@billing.grantum.app/plans') === null &&
      resolveExternalBillingUrl('') === null
  );
}

main();
