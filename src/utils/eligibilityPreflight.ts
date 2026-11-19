import type { Grant } from '@/types/grant';
import type { ProfileRevision, ProjectProfile } from '@/types/workspace';

export type PreflightCriterionStatus = 'met' | 'review' | 'unconfirmed';
export type PreflightQuestionSource = 'grant-criteria' | 'profile-gap' | 'agent' | 'custom';
export type PreflightRecordMode = 'empty-template' | 'generated' | 'agent-populated';

export interface PreflightScope {
  projectId: string;
  grantId: string;
  profileRevisionId: string;
  chatId: string;
}

export interface EligibilityCriterionCheck {
  id: string;
  label: string;
  status: PreflightCriterionStatus;
  answer: string;
  source: PreflightQuestionSource;
  uncertainty?: string;
}

export interface GrantPreflightRecord {
  scopeKey: string;
  grantId: string;
  projectId: string;
  profileRevisionId: string;
  chatId: string;
  mode: PreflightRecordMode;
  criteria: EligibilityCriterionCheck[];
  updatedAt: string;
}

export interface AgentPreflightQuestionInput {
  question: string;
  uncertainty?: string;
}

export interface PreflightPersistedState {
  records: Record<string, GrantPreflightRecord>;
  chatSessions: Record<string, number>;
}

export const MAX_PREFLIGHT_RECORDS = 200;
export const MAX_PREFLIGHT_CRITERIA = 20;

const VALID_STATUSES: ReadonlySet<PreflightCriterionStatus> = new Set([
  'met',
  'review',
  'unconfirmed',
]);

const VALID_SOURCES: ReadonlySet<PreflightQuestionSource> = new Set([
  'grant-criteria',
  'profile-gap',
  'agent',
  'custom',
]);

const VALID_MODES: ReadonlySet<PreflightRecordMode> = new Set([
  'empty-template',
  'generated',
  'agent-populated',
]);

export function preflightScopeKey(scope: PreflightScope): string {
  const projectId = scope.projectId.trim() || 'project-1';
  const grantId = scope.grantId.trim() || 'unknown';
  const profileRevisionId = scope.profileRevisionId.trim() || 'latest';
  const chatId = scope.chatId.trim() || 'chat-1';
  return `preflight:${projectId}:${grantId}:${profileRevisionId}:${chatId}`;
}

export function stableQuestionId(question: string): string {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `q-${(hash >>> 0).toString(36)}`;
}

export function buildEmptyPreflight(scope: PreflightScope, nowIso = ''): GrantPreflightRecord {
  const scopeKey = preflightScopeKey(scope);
  return {
    scopeKey,
    grantId: scope.grantId.trim() || 'unknown',
    projectId: scope.projectId.trim() || 'project-1',
    profileRevisionId: scope.profileRevisionId.trim() || 'latest',
    chatId: scope.chatId.trim() || 'chat-1',
    mode: 'empty-template',
    criteria: [],
    updatedAt: nowIso,
  };
}

function buildCriterionUncertainty(
  criterion: string,
  grant: Pick<Grant, 'region' | 'amount'>,
  fields: Record<string, string>
): string {
  const lower = criterion.toLowerCase();
  if (/region|europe|cis|global|district|footprint|jurisdiction/.test(lower)) {
    const region = (fields.region ?? '').trim();
    return region
      ? `Profile lists region "${region}" vs. grant region "${grant.region}" — confirm geographic eligibility.`
      : `Project Profile has no operating region recorded for "${grant.region}".`;
  }
  if (/co-fund|budget|funding|match|envelope|cost/.test(lower)) {
    const budget = (fields.budget ?? '').trim();
    return budget
      ? `Profile budget ("${budget}") should be verified against the ${grant.amount} envelope.`
      : `Project Profile has no budget or co-funding plan recorded for ${grant.amount}.`;
  }
  if (/entity|nonprofit|consortium|c-corp|ngo|foundation|registered|lead|clinic|team/.test(lower)) {
    const entity = (fields.entityType ?? '').trim();
    const lead = (fields.teamLead ?? '').trim();
    if (/lead|clinical|personnel/.test(lower)) {
      return lead
        ? `Profile lists "${lead}" — confirm authority for this solicitation.`
        : 'Project lead is missing in Project Profile — confirm who leads delivery.';
    }
    return entity
      ? `Profile entity type is "${entity}" — confirm it satisfies this funder rule.`
      : 'Legal entity type is missing in Project Profile — clarify applicant structure.';
  }
  return 'Confirm against your project profile so drafting avoids unverified assumptions.';
}

export function buildPreflightForGrantAndProfile(input: {
  scope: PreflightScope;
  grant: Pick<Grant, 'id' | 'title' | 'region' | 'amount' | 'eligibilityCriteria'>;
  requirements?: readonly string[];
  project?: Pick<ProjectProfile, 'id' | 'name' | 'kind'> | null;
  revision?: Pick<ProfileRevision, 'id' | 'fields'> | null;
  existing?: GrantPreflightRecord | null;
  nowIso?: string;
}): GrantPreflightRecord {
  const scopeKey = preflightScopeKey(input.scope);
  const fields = input.revision?.fields ?? {};
  const existingById = new Map(
    (input.existing?.criteria ?? []).map((item) => [item.id, item] as const)
  );
  const rawCriteria = (input.grant.eligibilityCriteria ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  const preservedCustom = (input.existing?.criteria ?? []).filter(
    (item) => item.source === 'custom'
  );
  const generatedLimit = Math.max(0, MAX_PREFLIGHT_CRITERIA - preservedCustom.length);

  const built: EligibilityCriterionCheck[] = [];
  const seen = new Set<string>();

  for (const label of rawCriteria) {
    if (built.length >= generatedLimit) break;
    const id = stableQuestionId(label);
    if (seen.has(id)) continue;
    seen.add(id);
    const prev = existingById.get(id);
    built.push({
      id,
      label,
      status: prev?.status ?? 'unconfirmed',
      answer: prev?.answer ?? '',
      source: 'grant-criteria',
      uncertainty: buildCriterionUncertainty(label, input.grant, fields),
    });
  }

  // Surface concrete Project Profile gaps relevant to drafting this specific grant.
  const gapChecks: { fieldKey: string; question: string; uncertainty: string }[] = [
    {
      fieldKey: 'teamLead',
      question: `Who is the named project lead for "${input.grant.title}"?`,
      uncertainty: `Project lead is blank in ${input.project?.name ?? 'active profile'} (${input.scope.profileRevisionId}).`,
    },
    {
      fieldKey: 'budget',
      question: `What direct budget and co-funding split fits ${input.grant.amount}?`,
      uncertainty: `Budget details are missing in ${input.project?.name ?? 'active profile'} (${input.scope.profileRevisionId}).`,
    },
    {
      fieldKey: 'entityType',
      question: `Which legal entity will sign the grant agreement for "${input.grant.title}"?`,
      uncertainty: `Legal entity is missing in ${input.project?.name ?? 'active profile'} (${input.scope.profileRevisionId}).`,
    },
  ];

  for (const gap of gapChecks) {
    if (built.length >= Math.min(6, generatedLimit)) break;
    if ((fields[gap.fieldKey] ?? '').trim().length >= 8) continue;
    const id = stableQuestionId(gap.question);
    if (seen.has(id)) continue;
    seen.add(id);
    const prev = existingById.get(id);
    built.push({
      id,
      label: gap.question,
      status: prev?.status ?? 'unconfirmed',
      answer: prev?.answer ?? '',
      source: 'profile-gap',
      uncertainty: gap.uncertainty,
    });
  }

  if (built.length === 0 && input.requirements && input.requirements.length > 0) {
    for (const req of input.requirements.slice(0, Math.min(3, generatedLimit))) {
      const clean = req.trim();
      if (!clean) continue;
      const question = `What verified evidence supports "${clean}" for ${input.project?.name ?? 'this project'}?`;
      const id = stableQuestionId(question);
      if (seen.has(id)) continue;
      seen.add(id);
      const prev = existingById.get(id);
      built.push({
        id,
        label: question,
        status: prev?.status ?? 'unconfirmed',
        answer: prev?.answer ?? '',
        source: 'grant-criteria',
        uncertainty:
          'Derived from grant requirements because explicit eligibility rules were absent.',
      });
    }
  }

  // Keep any applicant-authored custom questions across rescans.
  for (const prev of preservedCustom) {
    if (!seen.has(prev.id) && built.length < MAX_PREFLIGHT_CRITERIA) {
      seen.add(prev.id);
      built.push(prev);
    }
  }

  if (built.length === 0) {
    return buildEmptyPreflight(input.scope, input.nowIso ?? '');
  }

  return {
    scopeKey,
    grantId: input.scope.grantId.trim() || input.grant.id,
    projectId: input.scope.projectId.trim() || 'project-1',
    profileRevisionId: input.scope.profileRevisionId.trim() || 'latest',
    chatId: input.scope.chatId.trim() || 'chat-1',
    mode: 'generated',
    criteria: built.slice(0, MAX_PREFLIGHT_CRITERIA),
    updatedAt: input.nowIso ?? '',
  };
}

export function applyAgentPreflightQuestions(
  record: GrantPreflightRecord,
  questions: readonly AgentPreflightQuestionInput[],
  nowIso = new Date().toISOString()
): GrantPreflightRecord {
  const existingById = new Map(record.criteria.map((item) => [item.id, item] as const));
  const preservedCustom = record.criteria.filter((item) => item.source === 'custom');
  const agentLimit = Math.max(0, MAX_PREFLIGHT_CRITERIA - preservedCustom.length);
  const seen = new Set<string>();
  const nextCriteria: EligibilityCriterionCheck[] = [];

  for (const item of questions) {
    if (nextCriteria.length >= agentLimit) break;
    const label = item.question.trim().slice(0, 240);
    if (!label) continue;
    const id = stableQuestionId(label);
    if (seen.has(id)) continue;
    seen.add(id);
    const prev = existingById.get(id);
    nextCriteria.push({
      id,
      label,
      status: prev?.status ?? 'unconfirmed',
      answer: prev?.answer ?? '',
      source: 'agent',
      uncertainty: item.uncertainty?.trim().slice(0, 280) || prev?.uncertainty,
    });
  }

  for (const custom of preservedCustom) {
    if (!seen.has(custom.id) && nextCriteria.length < MAX_PREFLIGHT_CRITERIA) {
      seen.add(custom.id);
      nextCriteria.push(custom);
    }
  }

  return {
    ...record,
    mode: nextCriteria.length > 0 ? 'agent-populated' : 'empty-template',
    criteria: nextCriteria,
    updatedAt: nowIso,
  };
}

export function addCustomPreflightQuestion(
  record: GrantPreflightRecord,
  question: string,
  uncertainty?: string,
  nowIso = new Date().toISOString()
): GrantPreflightRecord {
  const clean = question.trim().slice(0, 240);
  if (!clean) throw new Error('Enter a pre-flight question before adding.');
  if (record.criteria.length >= 20) {
    throw new Error('Maximum of 20 pre-flight questions reached for this interview.');
  }
  const id = stableQuestionId(clean);
  if (record.criteria.some((item) => item.id === id)) {
    throw new Error('This pre-flight question is already in the interview.');
  }
  return {
    ...record,
    mode: record.mode === 'empty-template' ? 'generated' : record.mode,
    criteria: [
      ...record.criteria,
      {
        id,
        label: clean,
        status: 'unconfirmed',
        answer: '',
        source: 'custom',
        uncertainty: uncertainty?.trim().slice(0, 280) || undefined,
      },
    ],
    updatedAt: nowIso,
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

export function setPreflightCriterionAnswer(
  record: GrantPreflightRecord,
  criterionId: string,
  answer: string,
  nowIso = new Date().toISOString()
): GrantPreflightRecord {
  const clean = answer.slice(0, 500);
  return {
    ...record,
    criteria: record.criteria.map((item) =>
      item.id === criterionId ? { ...item, answer: clean } : item
    ),
    updatedAt: nowIso,
  };
}

export function formatPreflightContextBrief(record: GrantPreflightRecord): string {
  if (!record.criteria.length) return '';
  const lines = record.criteria.map((item) => {
    const tag =
      item.status === 'met'
        ? 'CONFIRMED'
        : item.status === 'review'
          ? 'NEEDS REVIEW'
          : 'UNCONFIRMED';
    const note = item.answer.trim() ? ` — ${item.answer.trim()}` : '';
    return `- [${tag}] ${item.label}${note}`;
  });
  return `Pre-flight precision context (${record.profileRevisionId}, ${record.chatId}):\n${lines.join('\n')}`;
}

export function summarizePreflight(record: GrantPreflightRecord) {
  const metCount = record.criteria.filter((item) => item.status === 'met').length;
  const reviewCount = record.criteria.filter((item) => item.status === 'review').length;
  const unconfirmedCount = record.criteria.filter((item) => item.status === 'unconfirmed').length;
  const totalCount = record.criteria.length;
  const isEmpty = totalCount === 0;
  return {
    metCount,
    reviewCount,
    unconfirmedCount,
    totalCount,
    isEmpty,
    summaryText: isEmpty
      ? 'Empty pre-flight template · Scan grant & profile or add questions before drafting.'
      : `${metCount}/${totalCount} pre-flight checks confirmed · Does not verify official funder eligibility.`,
  };
}

export function prunePreflightRecords(
  records: Record<string, GrantPreflightRecord>,
  maxEntries = MAX_PREFLIGHT_RECORDS
): Record<string, GrantPreflightRecord> {
  const entries = Object.entries(records);
  if (entries.length <= maxEntries) return records;
  const sorted = [...entries].sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt));
  return Object.fromEntries(sorted.slice(0, maxEntries));
}

export function extractMaxChatSeq(
  records: Record<string, GrantPreflightRecord>,
  projectId: string,
  grantId: string
): number {
  const cleanProject = projectId.trim() || 'project-1';
  const cleanGrant = grantId.trim() || 'unknown';
  let maxSeq = 1;
  for (const record of Object.values(records)) {
    if (record.projectId !== cleanProject || record.grantId !== cleanGrant) continue;
    const match = /^chat-(\d+)$/.exec(record.chatId);
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return maxSeq;
}

export function isChatSessionMap(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_PREFLIGHT_RECORDS) return false;
  return entries.every(
    ([key, seq]) =>
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 160 &&
      typeof seq === 'number' &&
      Number.isInteger(seq) &&
      seq >= 1 &&
      seq <= 10000
  );
}

export function isEligibilityPreflightMap(
  value: unknown
): value is Record<string, GrantPreflightRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_PREFLIGHT_RECORDS) return false;
  return entries.every(([key, item]) => {
    if (!item || typeof item !== 'object') return false;
    const rec = item as GrantPreflightRecord;
    return (
      typeof key === 'string' &&
      rec.scopeKey === key &&
      typeof rec.grantId === 'string' &&
      rec.grantId.length > 0 &&
      typeof rec.projectId === 'string' &&
      rec.projectId.length > 0 &&
      typeof rec.profileRevisionId === 'string' &&
      rec.profileRevisionId.length > 0 &&
      typeof rec.chatId === 'string' &&
      rec.chatId.length > 0 &&
      VALID_MODES.has(rec.mode) &&
      typeof rec.updatedAt === 'string' &&
      Array.isArray(rec.criteria) &&
      rec.criteria.length <= MAX_PREFLIGHT_CRITERIA &&
      rec.criteria.every(
        (crit) =>
          crit &&
          typeof crit.id === 'string' &&
          crit.id.length > 0 &&
          typeof crit.label === 'string' &&
          crit.label.length > 0 &&
          typeof crit.answer === 'string' &&
          VALID_STATUSES.has(crit.status) &&
          VALID_SOURCES.has(crit.source) &&
          (crit.uncertainty === undefined || typeof crit.uncertainty === 'string')
      )
    );
  });
}

export function isEligibilityPreflightState(value: unknown): value is PreflightPersistedState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isEligibilityPreflightMap(candidate.records) && isChatSessionMap(candidate.chatSessions);
}
