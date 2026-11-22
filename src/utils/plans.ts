import { isSafeExternalUrl } from '@/utils/navigationHistory';

export type BillingRegion = 'cis' | 'east-europe' | 'global';
export type AdditionalBillingRegionId =
  | 'north-america'
  | 'western-europe'
  | 'latin-america'
  | 'mena'
  | 'sub-saharan-africa'
  | 'east-asia-pacific'
  | 'south-southeast-asia'
  | 'central-asia'
  | 'oceania';
export type BillingRegionId = BillingRegion | AdditionalBillingRegionId;
export type SubscriptionTierId = 't1' | 't2' | 't3';
export type AffiliateTierChoice = 'free' | SubscriptionTierId;

export interface BillingRegionInfo {
  id: BillingRegionId;
  label: string;
  shortLabel: string;
  calibrated: boolean;
}

export interface SubscriptionTierSpec {
  id: SubscriptionTierId;
  name: string;
  offerTag: string;
  ctaLabel: string;
  subtitle: string;
  prices: Record<BillingRegion, number>;
  highlights: readonly string[];
  notesMode: string;
  aiModels: string;
  enterpriseNote?: string;
}

export interface TierRegionPricing {
  calibrated: boolean;
  amountUsd: number | null;
  priceLabel: string;
  periodLabel: string;
  statusNote: string | null;
}

export interface ReferralAccountEvent {
  id: string;
  label: string;
  dateLabel: string;
  status: 'verified-active' | 'invited-pending';
  inviterGt: number;
  inviteeGt: number;
}

export interface ReferralLedgerSummary {
  earnedGt: number;
  pendingGt: number;
  inviteeDistributedGt: number;
  verifiedInvites: number;
  pendingInvites: number;
  canSplitCredits: boolean;
  canPoolCredits: boolean;
  commissionRateLabel: string;
}

export const BILLING_REGIONS: readonly BillingRegionInfo[] = [
  { id: 'cis', label: 'CIS (СНГ)', shortLabel: 'CIS', calibrated: true },
  { id: 'east-europe', label: 'Eastern Europe', shortLabel: 'East Europe', calibrated: true },
  { id: 'global', label: 'Global', shortLabel: 'Global', calibrated: true },
];

export const ADDITIONAL_BILLING_REGIONS: readonly BillingRegionInfo[] = [
  { id: 'north-america', label: 'North America', shortLabel: 'North America', calibrated: false },
  {
    id: 'western-europe',
    label: 'Western Europe',
    shortLabel: 'Western Europe',
    calibrated: false,
  },
  {
    id: 'latin-america',
    label: 'Latin America & Caribbean',
    shortLabel: 'Latin America',
    calibrated: false,
  },
  {
    id: 'mena',
    label: 'Middle East & North Africa (MENA)',
    shortLabel: 'MENA',
    calibrated: false,
  },
  {
    id: 'sub-saharan-africa',
    label: 'Sub-Saharan Africa',
    shortLabel: 'Sub-Saharan Africa',
    calibrated: false,
  },
  {
    id: 'east-asia-pacific',
    label: 'East Asia & Pacific',
    shortLabel: 'East Asia & Pacific',
    calibrated: false,
  },
  {
    id: 'south-southeast-asia',
    label: 'South & Southeast Asia',
    shortLabel: 'South & SE Asia',
    calibrated: false,
  },
  {
    id: 'central-asia',
    label: 'Central Asia & Caucasus',
    shortLabel: 'Central Asia',
    calibrated: false,
  },
  { id: 'oceania', label: 'Oceania (Australia & NZ)', shortLabel: 'Oceania', calibrated: false },
];

export const ALL_BILLING_REGIONS: readonly BillingRegionInfo[] = [
  ...BILLING_REGIONS,
  ...ADDITIONAL_BILLING_REGIONS,
];

const CALIBRATED_REGION_SET = new Set<string>(BILLING_REGIONS.map((item) => item.id));

export function isCalibratedBillingRegion(regionId: string): regionId is BillingRegion {
  return CALIBRATED_REGION_SET.has(regionId);
}

export function getBillingRegionInfo(regionId: string): BillingRegionInfo {
  const match = ALL_BILLING_REGIONS.find((item) => item.id === regionId);
  if (match) return match;
  const fallback = regionId.trim() || 'Selected region';
  return {
    id: regionId as BillingRegionId,
    label: fallback,
    shortLabel: fallback,
    calibrated: false,
  };
}

export function formatUsdPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Resolves the visible and accessible tier price for a billing region.
 * Regions without calibrated PPP rates return an explicit pending state rather than silently charging a fallback rate.
 */
export function resolveTierRegionPricing(
  tier: SubscriptionTierSpec,
  regionId: BillingRegionId
): TierRegionPricing {
  if (isCalibratedBillingRegion(regionId)) {
    const amountUsd = tier.prices[regionId];
    return {
      calibrated: true,
      amountUsd,
      priceLabel: formatUsdPrice(amountUsd),
      periodLabel: '/ mo',
      statusNote: null,
    };
  }
  return {
    calibrated: false,
    amountUsd: null,
    priceLabel: 'PPP rate pending',
    periodLabel: '',
    statusNote: 'Regional rate recalibrating — no fallback charge applied.',
  };
}

export const SUBSCRIPTION_TIERS: readonly SubscriptionTierSpec[] = [
  {
    id: 't1',
    name: 'Tier 1 · Starter',
    offerTag: 'STARTER OFFER',
    ctaLabel: 'Select Starter',
    subtitle: 'Grant database access, simple models & notes',
    prices: { cis: 9.99, 'east-europe': 14.99, global: 19.99 },
    aiModels: 'Simple AI models + starter monthly credit pool',
    notesMode: 'Notes',
    highlights: [
      'Full access to Grantum grant database and opportunity discovery',
      'Simple AI models with a starter monthly credit pool',
      'Notes for personal drafting and opportunity tracking',
    ],
  },
  {
    id: 't2',
    name: 'Tier 2 · Pro',
    offerTag: 'MOST POPULAR',
    ctaLabel: 'Select Pro',
    subtitle: 'Premium AI models, queue skip & sharable notes',
    prices: { cis: 19.99, 'east-europe': 29.99, global: 49.99 },
    aiModels: 'Premium AI models, higher usage limits & priority queue skip',
    notesMode: 'Sharable notes',
    highlights: [
      'Premium AI models with higher usage limits and priority queue skip',
      'Sharable notes via private read-only links',
      'Unlocks splitting bilateral referral GT credit rewards',
    ],
  },
  {
    id: 't3',
    name: 'Tier 3 · Team & Co-Work',
    offerTag: 'TEAM & CO-WORK',
    ctaLabel: 'Select Team & Co-Work',
    subtitle: 'Deep-research grantwriting, co-working space & work history',
    prices: { cis: 44.99, 'east-europe': 69.99, global: 99.99 },
    aiModels:
      'Professional AI models + priority limits + free 20% token refill once per month when needed',
    notesMode:
      'Collaborative Co-working Space + notes & drafts with multi-user editing and work history',
    enterpriseNote: 'Custom Enterprise tier available beyond Tier 3',
    highlights: [
      'Professional AI models and deep-research grantwriting workflow',
      'Collaborative Co-working Space + notes & drafts with multi-user editing and work history',
      'Invite a co-founder to view shared assistant chats',
      'Priority usage limits + one free 20% token refill per month when needed',
      'Expert guidance and peer-review guide included',
      'Unlocks pooling and merging referral GT credits across team members',
    ],
  },
];

export const PPP_ELIGIBILITY_NOTE =
  'Purchasing Power Parity (PPP) adjusts subscription pricing by billing region while keeping grant opportunity eligibility strictly independent of billing region.';

export const REFERRAL_PROGRAM = {
  inviterRewardGt: 700,
  inviteeRewardGt: 300,
  headline: 'Two-sided referral program (700 GT inviter / 300 GT friend)',
  summary:
    'Initiator-advantaged bilateral reward: the user who invites receives 700 GT and each invited friend receives 300 GT.',
  retentionRules:
    'Credits can be used individually, cannot be split without a Tier 2 subscription, and cannot be pooled or merged across accounts without Tier 3 — keeping multi-founder teams anchored on one shared workspace.',
} as const;

export const AFFILIATE_PROGRAM = {
  ratesLabel: '10% | 15% | 25%',
  headline: 'Lifetime affiliate commission (10% | 15% | 25% via USDT)',
  audience: 'For webmasters, startup community leaders, and content creators',
  payoutMethod:
    'Automatic payouts via USDT to avoid cross-border banking delays and currency restrictions.',
  eligibilitySummary:
    'Anti-fraud eligibility: requires 5 or more invited users AND either an active Tier 3 subscription or at least 2 subscribed months on any paid tier.',
} as const;

export const AFFILIATE_ACCOUNT_EVENTS: readonly ReferralAccountEvent[] = [
  {
    id: 'ref-evt-1',
    label: 'Partner team onboarding · Workspace A',
    dateLabel: '14 Oct 2026',
    status: 'verified-active',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-2',
    label: 'Co-founder invite · CleanWater Lab',
    dateLabel: '21 Oct 2026',
    status: 'verified-active',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-3',
    label: 'Research group invite · BioGrid Unit',
    dateLabel: '02 Nov 2026',
    status: 'verified-active',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-4',
    label: 'Founder referral · SolarMicrogrid',
    dateLabel: '09 Nov 2026',
    status: 'verified-active',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-5',
    label: 'Ecosystem invite · CivicSense Lab',
    dateLabel: '14 Nov 2026',
    status: 'verified-active',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-6',
    label: 'Awaiting workspace activation · Invite #6',
    dateLabel: '18 Nov 2026',
    status: 'invited-pending',
    inviterGt: 700,
    inviteeGt: 300,
  },
  {
    id: 'ref-evt-7',
    label: 'Awaiting workspace activation · Invite #7',
    dateLabel: '20 Nov 2026',
    status: 'invited-pending',
    inviterGt: 700,
    inviteeGt: 300,
  },
];

export function getReferralEventsForDataSource(
  dataSource: 'mock' | 'api'
): readonly ReferralAccountEvent[] {
  return dataSource === 'mock' ? AFFILIATE_ACCOUNT_EVENTS : [];
}

export function formatGtCount(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Math.max(0, Math.round(safe)).toLocaleString('en-US');
}

export function computeReferralLedger(
  events: readonly ReferralAccountEvent[],
  currentTier: AffiliateTierChoice
): ReferralLedgerSummary {
  let earnedGt = 0;
  let pendingGt = 0;
  let inviteeDistributedGt = 0;
  let verifiedInvites = 0;
  let pendingInvites = 0;

  for (const event of events) {
    if (event.status === 'verified-active') {
      earnedGt += event.inviterGt;
      inviteeDistributedGt += event.inviteeGt;
      verifiedInvites += 1;
    } else {
      pendingGt += event.inviterGt;
      pendingInvites += 1;
    }
  }

  const commissionRateLabel =
    currentTier === 't3'
      ? '25% USDT'
      : currentTier === 't2'
        ? '15% USDT'
        : currentTier === 't1'
          ? '10% USDT'
          : '10% | 15% | 25% USDT';

  return {
    earnedGt,
    pendingGt,
    inviteeDistributedGt,
    verifiedInvites,
    pendingInvites,
    canSplitCredits: currentTier === 't2' || currentTier === 't3',
    canPoolCredits: currentTier === 't3',
    commissionRateLabel,
  };
}

export interface AffiliateEligibilityInput {
  invitedCount: number;
  currentTier: AffiliateTierChoice;
  subscribedMonths: number;
}

export interface AffiliateEligibilityResult {
  eligible: boolean;
  summary: string;
  missingReasons: string[];
}

export function evaluateAffiliateEligibility(
  input: AffiliateEligibilityInput
): AffiliateEligibilityResult {
  const invitedCount = Number.isFinite(input.invitedCount)
    ? Math.max(0, Math.floor(input.invitedCount))
    : 0;
  const subscribedMonths = Number.isFinite(input.subscribedMonths)
    ? Math.max(0, Math.floor(input.subscribedMonths))
    : 0;
  const missingReasons: string[] = [];

  if (invitedCount < 5) {
    missingReasons.push(`Need at least 5 invited users (${5 - invitedCount} remaining).`);
  }

  const hasPaidStanding =
    input.currentTier === 't3' || (input.currentTier !== 'free' && subscribedMonths >= 2);
  if (!hasPaidStanding) {
    missingReasons.push(
      'Requires an active Tier 3 subscription or at least 2 subscribed months on Tier 1 or Tier 2.'
    );
  }

  const eligible = missingReasons.length === 0;
  return {
    eligible,
    summary: eligible
      ? 'Eligible to apply for 10% | 15% | 25% lifetime USDT commissions.'
      : 'Not yet eligible to apply for lifetime affiliate payouts.',
    missingReasons,
  };
}

export function resolveExternalBillingUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return isSafeExternalUrl(trimmed) ? trimmed : null;
}
