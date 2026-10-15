import { CONSTANTS, CONFIDENCE_TIER } from '@/config/constants';
import { ScoreTier } from '@/types/api';

/**
 * Calculates score tier according to constitutional thresholds
 */
export function scoreTier(
  score: number,
  thresholds: { pass: number; warn: number } = CONFIDENCE_TIER
): ScoreTier {
  if (score >= thresholds.pass) return 'verified';
  if (score >= thresholds.warn) return 'pending';
  return 'failure';
}

/**
 * Volatile denominator formula ported directly from Next.js V7.2
 * Each section is worth 100 / required.length points
 */
export function draftConfidenceScore(
  completedSections: string[],
  requiredSections: readonly string[] | string[] = CONSTANTS.REQUIRED_DRAFT_SECTIONS
): number {
  if (!requiredSections.length) return 100;
  const completed = completedSections.filter((section) =>
    requiredSections.includes(section)
  ).length;
  return Math.round((completed / requiredSections.length) * 100);
}
