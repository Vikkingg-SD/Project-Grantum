import {
  AFFILIATE_PROGRAM,
  BUSINESS_MODEL_PILLARS,
  REFERRAL_PROGRAM,
  SUBSCRIPTION_TIERS,
  UNIT_ECONOMICS_METRICS,
  evaluateAffiliateEligibility,
  formatUsdPrice,
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
    'Given bilateral referral and B2B2C unit economics When inspecting specs Then 700/300 GT, 10/15/25% USDT, and 54-user break-even exist',
    REFERRAL_PROGRAM.inviterRewardGt === 700 &&
      REFERRAL_PROGRAM.inviteeRewardGt === 300 &&
      AFFILIATE_PROGRAM.ratesLabel === '10% | 15% | 25%' &&
      BUSINESS_MODEL_PILLARS.segments.includes('Startups') &&
      UNIT_ECONOMICS_METRICS.some((m) => m.value === '54 users') &&
      UNIT_ECONOMICS_METRICS.some((m) => m.value === '6.5 : 3 : 0.5')
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
    'Given >=5 invites with active T3 or >=2 months on T1/T2 When checking affiliate eligibility Then eligible',
    eligibleT3.eligible && eligibleT1.eligible
  );
}

main();
