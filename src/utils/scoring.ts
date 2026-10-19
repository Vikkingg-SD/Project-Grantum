import { DEFAULT_REQUIRED_SECTIONS, TIERS } from '@/config/constants';
import type { ProposalDraft, ScoreTier, SectionMutation } from '@/types/api';

export function scoreTier(
  score: number,
  thresholds: { pass: number; warn: number } = TIERS.confidence
): ScoreTier {
  if (score >= thresholds.pass) return 'verified';
  if (score >= thresholds.warn) return 'pending';
  return 'failure';
}

export function isExportUnlocked(score: number): boolean {
  return score >= TIERS.confidence.pass;
}
export function matchTier(pct: number): ScoreTier {
  return scoreTier(pct, TIERS.match);
}
export function confidenceTier(score: number): ScoreTier {
  return scoreTier(score, TIERS.confidence);
}

export function draftConfidenceScore(
  completedSections: string[],
  requiredSections: readonly string[] | string[] = DEFAULT_REQUIRED_SECTIONS
): number {
  if (!requiredSections.length) return 100;
  const requiredSet = new Set(requiredSections);
  const done = new Set(completedSections.filter((section) => requiredSet.has(section)));
  return Math.round((done.size / requiredSections.length) * 100);
}

export function missingSections(
  completedSections: string[],
  requiredSections: readonly string[] | string[] = DEFAULT_REQUIRED_SECTIONS
): string[] {
  const done = new Set(completedSections);
  return requiredSections.filter((name) => !done.has(name));
}

export function applySectionMutation(draft: ProposalDraft, input: SectionMutation): ProposalDraft {
  const name = input.sectionName?.trim() ?? '';
  let completed = [...draft.completedSections];
  let required = [...draft.requiredSections];

  switch (input.action) {
    case 'markMissing':
    case 'remove':
      completed = completed.filter((item) => item !== name);
      break;
    case 'restoreAll':
    case 'restore':
      completed = [...required];
      break;
    case 'addRequirement':
    case 'add':
      if (name && !required.includes(name)) {
        required = [...required, name];
        completed = [...completed, name];
      }
      break;
    case 'deleteRequirement':
      required = required.filter((item) => item !== name);
      completed = completed.filter((item) => item !== name);
      break;
  }

  return {
    ...draft,
    completedSections: completed,
    requiredSections: required,
    confidenceScore: draftConfidenceScore(completed, required),
  };
}
