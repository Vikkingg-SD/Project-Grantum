export type BillingRegion = 'cis' | 'east-europe' | 'global';
export type SubscriptionTierId = 't1' | 't2' | 't3';
export type AffiliateTierChoice = 'free' | SubscriptionTierId;

export interface BillingRegionInfo {
  id: BillingRegion;
  label: string;
  shortLabel: string;
}

export interface SubscriptionTierSpec {
  id: SubscriptionTierId;
  name: string;
  subtitle: string;
  prices: Record<BillingRegion, number>;
  highlights: readonly string[];
  notesMode: string;
  aiModels: string;
  enterpriseNote?: string;
}

export const BILLING_REGIONS: readonly BillingRegionInfo[] = [
  { id: 'cis', label: 'CIS (СНГ)', shortLabel: 'CIS' },
  { id: 'east-europe', label: 'Eastern Europe', shortLabel: 'East Europe' },
  { id: 'global', label: 'Global', shortLabel: 'Global' },
];

export const SUBSCRIPTION_TIERS: readonly SubscriptionTierSpec[] = [
  {
    id: 't1',
    name: 'Tier 1 · Starter',
    subtitle: 'Grant database access, simple models & personal notes',
    prices: { cis: 9.99, 'east-europe': 14.99, global: 19.99 },
    aiModels: 'Simple AI models + small monthly credit pool',
    notesMode: 'Samsung Notes × Discord topics layout (personal use only; cannot be shared)',
    highlights: [
      'Full access to Grantum grant database site and app discovery functions',
      'Simple AI models with a starter monthly credit pool',
      'Personal notes in Samsung Notes × Discord topics format (private, non-shareable)',
    ],
  },
  {
    id: 't2',
    name: 'Tier 2 · Pro',
    subtitle: 'Premium AI models, queue skip & private read-only note links',
    prices: { cis: 19.99, 'east-europe': 29.99, global: 49.99 },
    aiModels: 'Premium AI models, higher usage limits & priority queue skip',
    notesMode: 'Shareable via direct private read-only link (recipients cannot edit)',
    highlights: [
      'Premium AI models with higher usage limits and priority queue skip',
      'Notes shareable via direct private link (view-only, non-editable)',
      'Unlocks splitting bilateral referral GT credit rewards',
    ],
  },
  {
    id: 't3',
    name: 'Tier 3 · Team & Co-Work',
    subtitle: 'Deep-research grantwriting, shared co-working workspace & co-founder chats',
    prices: { cis: 44.99, 'east-europe': 69.99, global: 99.99 },
    aiModels:
      'Professional AI models + priority limits + free 20% token refill once per month when needed',
    notesMode:
      'Collaborative Co-working Zone notes & drafts with multi-user editing and author attribution',
    enterpriseNote: 'Custom Enterprise tier available beyond Tier 3',
    highlights: [
      'Professional AI models and deep-research style grantwriting workflow',
      'Included Co-working Zone and shared application workspace',
      'Multi-editor notes and drafts tracking who edited what',
      'Invite a co-founder to view shared assistant chats',
      'Priority usage limits + one free 20% token refill per month when needed',
      'Bonus: Expert guidance and peer-review guide included',
      'Unlocks pooling/merging referral GT credits across team members',
    ],
  },
];

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
  audience: 'For webmasters, startup community leaders, and YouTubers',
  payoutMethod:
    'Automatic payouts via USDT to avoid cross-border banking delays and currency restrictions.',
  eligibilitySummary:
    'Anti-fraud eligibility: requires 5 or more invited users AND either an active Tier 3 subscription or at least 2 subscribed months on any paid tier.',
} as const;

export const BUSINESS_MODEL_PILLARS = {
  segments: ['Startups', 'NGOs / NPOs', 'R&D & Innovations'],
  offerings: [
    'Grantwriting',
    'Consultations',
    '% Success fee',
    'Tier 1–3 PPP subscriptions ($10 | $15 | $20 to Enterprise)',
  ],
  pppNote:
    'Purchasing Power Parity (PPP) adjusts subscription pricing by billing region while keeping grant opportunity eligibility strictly independent of billing region.',
} as const;

export const UNIT_ECONOMICS_METRICS: readonly { label: string; value: string }[] = [
  { label: 'Break-even scale', value: '54 users' },
  { label: 'Freemium token pool', value: '$1.50' },
  { label: 'Subscription token allocation', value: '30% of plan' },
  { label: 'Hosting cost', value: '$0.40 / user' },
  { label: 'Customer acquisition (CAC)', value: '$6.40' },
  { label: 'Monthly operations', value: '$500 / mo' },
  { label: 'LCAC marketing', value: '$750 / mo' },
  { label: 'Target tier mix (T1 : T2 : T3)', value: '6.5 : 3 : 0.5' },
  { label: 'Acquisition channels', value: 'UGC + LCAC' },
];

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
  const invitedCount = Math.max(0, Math.floor(input.invitedCount));
  const subscribedMonths = Math.max(0, Math.floor(input.subscribedMonths));
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

export function formatUsdPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
