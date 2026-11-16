import type { Grant } from '@/types/grant';

export type PreflightCriterionStatus = 'met' | 'review' | 'unconfirmed';

export interface EligibilityCriterionCheck {
  id: string;
  label: string;
  status: PreflightCriterionStatus;
}

export interface GrantPreflightRecord {
  grantId: string;
  criteria: EligibilityCriterionCheck[];
  updatedAt: string;
}

const VALID_STATUSES: ReadonlySet<PreflightCriterionStatus> = new Set([
  'met',
  'review',
  'unconfirmed',
]);

export function buildDefaultPreflight(
  grant: Pick<Grant, 'id' | 'region' | 'eligibilityCriteria'>
): GrantPreflightRecord {
  const labels =
    grant.eligibilityCriteria && grant.eligibilityCriteria.length > 0
      ? grant.eligibilityCriteria
      : [
          `Confirm legal registration matches ${grant.region}`,
          'Confirm timeline and co-funding capacity',
          'Prepare required supporting documentation',
        ];
  return {
    grantId: grant.id,
    criteria: labels.map((label, index) => ({
      id: `${grant.id}-crit-${index + 1}`,
      label,
      status: 'unconfirmed',
    })),
    updatedAt: '',
  };
}

export function setPreflightCriterionStatus(
  record: GrantPreflightRecord,
  criterionId: string,
  status: PreflightCriterionStatus,
  nowIso = new Date().toISOString()
): GrantPreflightRecord {
  return {
    ...record,
    criteria: record.criteria.map((item) => (item.id === criterionId ? { ...item, status } : item)),
    updatedAt: nowIso,
  };
}

export function summarizePreflight(record: GrantPreflightRecord) {
  const metCount = record.criteria.filter((item) => item.status === 'met').length;
  const reviewCount = record.criteria.filter((item) => item.status === 'review').length;
  const unconfirmedCount = record.criteria.filter((item) => item.status === 'unconfirmed').length;
  const totalCount = record.criteria.length;
  return {
    metCount,
    reviewCount,
    unconfirmedCount,
    totalCount,
    summaryText: `${metCount}/${totalCount} criteria confirmed on this device \u00b7 Does not verify official funder eligibility.`,
  };
}

export function isEligibilityPreflightMap(
  value: unknown
): value is Record<string, GrantPreflightRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100) return false;
  return entries.every(([key, item]) => {
    if (!item || typeof item !== 'object') return false;
    const rec = item as GrantPreflightRecord;
    return (
      typeof key === 'string' &&
      rec.grantId === key &&
      typeof rec.updatedAt === 'string' &&
      Array.isArray(rec.criteria) &&
      rec.criteria.length <= 20 &&
      rec.criteria.every(
        (crit) =>
          crit &&
          typeof crit.id === 'string' &&
          typeof crit.label === 'string' &&
          crit.label.length > 0 &&
          VALID_STATUSES.has(crit.status)
      )
    );
  });
}
