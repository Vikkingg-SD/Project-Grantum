import type {
  ProfileAuditStatus,
  ProfileChecklistStatus,
  ProfileReadinessReport,
  ProfileRevision,
  ProjectKind,
  ProjectProfile,
  ProjectProfileAuditFieldResult,
  ProjectProfileAuditRecord,
  ReadinessChecklistItem,
} from '../types/workspace';

export const KNOWN_PROJECT_REGIONS = [
  'Global',
  'North America',
  'Western Europe',
  'East Europe',
  'CIS',
  'Latin America',
  'Middle East & North Africa',
  'Sub-Saharan Africa',
  'Asia-Pacific',
  'South Asia',
] as const;

export const KNOWN_ENTITY_TYPES = [
  'For-profit Startup (C-Corp / LLC)',
  'Nonprofit / 501(c)(3) Foundation',
  'Research Institute / University',
  'Municipal / Public Consortium',
  'Social Enterprise / B-Corp',
  'Independent Researcher / Individual',
] as const;

export const MAX_PROJECT_DOCS = 10;

export type ProfileFieldInputKind = 'textarea' | 'text' | 'region-multi' | 'entity-select';

export interface ProfileFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly weight: number;
  readonly impact: 'high' | 'medium';
  readonly inputKind: ProfileFieldInputKind;
  readonly minChars: number;
  readonly minWords: number;
  readonly guidance: string;
}

export const PROFILE_FIELD_DEFINITIONS: readonly ProfileFieldDefinition[] = [
  {
    key: 'mission',
    label: 'Mission',
    weight: 16,
    impact: 'high',
    inputKind: 'textarea',
    minChars: 200,
    minWords: 18,
    guidance:
      'Explain your core mission, long-term systemic goal, and measurable outcomes (minimum 200 characters).',
  },
  {
    key: 'problem',
    label: 'Problem evidence',
    weight: 15,
    impact: 'high',
    inputKind: 'textarea',
    minChars: 200,
    minWords: 18,
    guidance:
      'Document baseline metrics, affected population, and empirical problem scope (minimum 200 characters).',
  },
  {
    key: 'solution',
    label: 'Approach',
    weight: 15,
    impact: 'high',
    inputKind: 'textarea',
    minChars: 200,
    minWords: 18,
    guidance:
      'Describe technical or program architecture, implementation milestones, and operational readiness (minimum 200 characters).',
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    weight: 12,
    impact: 'high',
    inputKind: 'textarea',
    minChars: 120,
    minWords: 10,
    guidance:
      'Specify target beneficiaries, scale served, and equity or inclusion criteria (minimum 120 characters).',
  },
  {
    key: 'budget',
    label: 'Budget',
    weight: 14,
    impact: 'high',
    inputKind: 'textarea',
    minChars: 80,
    minWords: 6,
    guidance:
      'Outline direct/indirect cost breakdown, capital vs. operating allocation, and co-funding (minimum 80 characters).',
  },
  {
    key: 'region',
    label: 'Region',
    weight: 10,
    impact: 'medium',
    inputKind: 'region-multi',
    minChars: 1,
    minWords: 1,
    guidance: 'Select one or more operating regions from the dropdown.',
  },
  {
    key: 'entityType',
    label: 'Legal entity',
    weight: 10,
    impact: 'medium',
    inputKind: 'entity-select',
    minChars: 4,
    minWords: 1,
    guidance: 'Select your registered legal entity classification from the dropdown.',
  },
  {
    key: 'teamLead',
    label: 'Project lead',
    weight: 8,
    impact: 'medium',
    inputKind: 'text',
    minChars: 20,
    minWords: 3,
    guidance:
      'Name the lead person, role/title, and relevant delivery credentials (minimum 20 characters).',
  },
];

const KNOWN_ENTITY_SET = new Set<string>(KNOWN_ENTITY_TYPES);

export function parseProfileRegions(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const clean = part.trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function formatProfileRegions(regions: readonly string[]): string {
  return parseProfileRegions(regions.join(',')).join(', ');
}

export function sanitizeVaultDocName(name: string): string {
  const clean = name
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\|/g, '-')
    .trim();
  if (clean.length <= 180) return clean;
  const dot = clean.lastIndexOf('.');
  if (dot > 0 && clean.length - dot <= 16) {
    const ext = clean.slice(dot);
    return clean.slice(0, 180 - ext.length) + ext;
  }
  return clean.slice(0, 180);
}

export function parseVaultDocs(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw.split('|')) {
    const clean = sanitizeVaultDocName(item);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function addVaultDoc(
  raw: string | undefined,
  docName: string
): { next: string; error?: string } {
  const clean = sanitizeVaultDocName(docName);
  if (!clean) return { next: raw ?? '', error: 'Document filename is empty or invalid.' };
  const current = parseVaultDocs(raw);
  if (current.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    return { next: current.join(' | '), error: `"${clean}" is already attached to this project.` };
  }
  if (current.length >= MAX_PROJECT_DOCS) {
    return {
      next: current.join(' | '),
      error: `Remove a file before attaching more than ${MAX_PROJECT_DOCS} reference files.`,
    };
  }
  return { next: [...current, clean].join(' | ') };
}

export function removeVaultDoc(raw: string | undefined, docName: string): string {
  const clean = sanitizeVaultDocName(docName).toLowerCase();
  if (!clean) return parseVaultDocs(raw).join(' | ');
  return parseVaultDocs(raw)
    .filter((item) => item.toLowerCase() !== clean)
    .join(' | ');
}

export function toggleVaultDoc(raw: string | undefined, docName: string): string {
  const clean = sanitizeVaultDocName(docName);
  if (!clean) return raw ?? '';
  const current = parseVaultDocs(raw);
  const exists = current.some((item) => item.toLowerCase() === clean.toLowerCase());
  if (exists) return removeVaultDoc(raw, clean);
  return addVaultDoc(raw, clean).next;
}

const INVISIBLE_FORMAT_RE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g;
const CJK_THAI_CHAR_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f]/g;
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
const EDGE_PUNCTUATION_RE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

function collapseText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(INVISIBLE_FORMAT_RE, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeProfileFieldValue(key: string, value: string | undefined): string {
  if (key === 'region') {
    return parseProfileRegions(value)
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
  }
  if (key === 'vaultDocs') {
    return parseVaultDocs(value)
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join(' | ');
  }
  return collapseText(value);
}

type WordSegmenterCtor = new (
  locale?: string,
  options?: { granularity?: 'word' | 'grapheme' | 'sentence' }
) => {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};

function extractWords(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: WordSegmenterCtor }).Segmenter;
  if (typeof Segmenter === 'function') {
    const segmenter = new Segmenter(undefined, { granularity: 'word' });
    const tokens: string[] = [];
    for (const part of segmenter.segment(text)) {
      if (!part.isWordLike) continue;
      const clean = part.segment.replace(EDGE_PUNCTUATION_RE, '').toLowerCase();
      if (clean && WORD_CHAR_RE.test(clean)) tokens.push(clean);
    }
    return tokens;
  }
  const expanded = text.replace(CJK_THAI_CHAR_RE, (ch) => ` ${ch} `);
  return expanded
    .split(/\s+/)
    .map((token) => token.replace(EDGE_PUNCTUATION_RE, '').toLowerCase())
    .filter((token) => WORD_CHAR_RE.test(token));
}

function isLowSignalFiller(text: string, minWords: number): boolean {
  const compact = text.replace(/\s+/g, '');
  if (!compact) return true;
  const freq = new Map<string, number>();
  for (const ch of compact.toLowerCase()) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  const maxCharCount = Math.max(...freq.values());
  const distinctChars = freq.size;
  if (distinctChars < Math.min(8, Math.max(4, minWords)) || maxCharCount / compact.length > 0.4) {
    return true;
  }
  const words = extractWords(text);
  const uniqueCount = new Set(words).size;
  const minUniqueWords = Math.max(2, Math.floor(minWords * 0.45));
  if (uniqueCount < minUniqueWords) return true;
  if (words.length >= minWords && uniqueCount / words.length < 0.35) {
    return true;
  }
  return false;
}

export interface ProfileFieldEvaluation {
  readonly filled: boolean;
  readonly charCount: number;
  readonly minChars: number;
  readonly wordCount: number;
  readonly detailReason: string;
}

export function evaluateProfileField(
  def: ProfileFieldDefinition,
  rawValue: string | undefined
): ProfileFieldEvaluation {
  const normalized = collapseText(rawValue);
  if (def.inputKind === 'region-multi') {
    const regions = parseProfileRegions(rawValue);
    if (regions.length === 0) {
      return {
        filled: false,
        charCount: 0,
        minChars: def.minChars,
        wordCount: 0,
        detailReason: 'Select at least one operating region from the dropdown.',
      };
    }
    return {
      filled: true,
      charCount: normalized.length,
      minChars: def.minChars,
      wordCount: regions.length,
      detailReason: `${regions.length} operating ${regions.length === 1 ? 'region' : 'regions'} selected.`,
    };
  }

  if (def.inputKind === 'entity-select') {
    const words = extractWords(normalized);
    if (!normalized) {
      return {
        filled: false,
        charCount: 0,
        minChars: def.minChars,
        wordCount: 0,
        detailReason: 'Select your registered legal entity classification from the dropdown.',
      };
    }
    const isKnown = KNOWN_ENTITY_SET.has(normalized);
    if (
      !isKnown &&
      (normalized.length < 8 || words.length < 2 || isLowSignalFiller(normalized, 2))
    ) {
      return {
        filled: false,
        charCount: normalized.length,
        minChars: 8,
        wordCount: words.length,
        detailReason: 'Choose a known legal entity option or specify a valid classification.',
      };
    }
    return {
      filled: true,
      charCount: normalized.length,
      minChars: def.minChars,
      wordCount: words.length,
      detailReason: `Classification recorded: ${normalized}.`,
    };
  }

  const charCount = normalized.length;
  const words = extractWords(normalized);
  if (charCount === 0) {
    return {
      filled: false,
      charCount: 0,
      minChars: def.minChars,
      wordCount: 0,
      detailReason: def.guidance,
    };
  }
  if (charCount < def.minChars) {
    const remaining = def.minChars - charCount;
    return {
      filled: false,
      charCount,
      minChars: def.minChars,
      wordCount: words.length,
      detailReason: `Add at least ${remaining} more character${remaining === 1 ? '' : 's'} (${charCount}/${def.minChars}) for sufficient detail.`,
    };
  }
  if (words.length < def.minWords || isLowSignalFiller(normalized, def.minWords)) {
    return {
      filled: false,
      charCount,
      minChars: def.minChars,
      wordCount: words.length,
      detailReason: 'Provide concrete project facts rather than repeated or placeholder text.',
    };
  }
  return {
    filled: true,
    charCount,
    minChars: def.minChars,
    wordCount: words.length,
    detailReason: `Meets detail threshold (${charCount} chars).`,
  };
}

export function computeProfileFieldFingerprints(
  fields: Readonly<Record<string, string>>
): Record<string, string> {
  const fingerprints: Record<string, string> = {};
  for (const def of PROFILE_FIELD_DEFINITIONS) {
    fingerprints[def.key] = normalizeProfileFieldValue(def.key, fields[def.key]);
  }
  return fingerprints;
}

export function computeProfileContentSignature(input: {
  name: string;
  kind: ProjectKind;
  fields: Readonly<Record<string, string>>;
}): string {
  const keys = Array.from(
    new Set([...PROFILE_FIELD_DEFINITIONS.map((d) => d.key), ...Object.keys(input.fields)])
  ).sort();
  const normalizedFields: Record<string, string> = {};
  for (const key of keys) {
    normalizedFields[key] = normalizeProfileFieldValue(key, input.fields[key]);
  }
  return JSON.stringify({
    name: input.name.trim(),
    kind: input.kind,
    fields: normalizedFields,
  });
}

export function computeProfileReadiness(
  project: ProjectProfile,
  revision: ProfileRevision,
  auditRecord?: ProjectProfileAuditRecord
): ProfileReadinessReport {
  const currentFingerprints = computeProfileFieldFingerprints(revision.fields);
  const currentSignature = computeProfileContentSignature({
    name: project.name,
    kind: project.kind,
    fields: revision.fields,
  });

  let detailedScore = 0;
  let auditedScore = 0;
  const matchesProjectAudit = auditRecord?.projectId === project.id;

  const checklist: ReadinessChecklistItem[] = PROFILE_FIELD_DEFINITIONS.map((def) => {
    const evalResult = evaluateProfileField(def, revision.fields[def.key]);
    const fieldAudit = matchesProjectAudit ? auditRecord.fieldResults[def.key] : undefined;
    const fingerprintMatches =
      matchesProjectAudit &&
      auditRecord.fieldFingerprints[def.key] === currentFingerprints[def.key];

    let status: ProfileChecklistStatus;
    if (!evalResult.filled) {
      status = 'needs-detail';
    } else if (fingerprintMatches && fieldAudit?.passed) {
      status = 'audited';
    } else {
      status = 'review-required';
    }

    if (evalResult.filled) detailedScore += def.weight;
    if (status === 'audited') auditedScore += def.weight;

    return {
      key: def.key,
      label: def.label,
      filled: evalResult.filled,
      status,
      impact: def.impact,
      guidance: def.guidance,
      charCount: evalResult.charCount,
      minChars: evalResult.minChars,
      detailReason: evalResult.detailReason,
    };
  });

  let auditStatus: ProfileAuditStatus;
  if (!matchesProjectAudit || !auditRecord) {
    auditStatus = 'not-audited';
  } else if (auditRecord.contentSignature !== currentSignature) {
    auditStatus = 'stale';
  } else if (auditRecord.allPassed) {
    auditStatus = 'audited';
  } else {
    auditStatus = 'action-required';
  }

  return {
    score: detailedScore,
    auditedScore,
    auditStatus,
    profileRevisionId: revision.id,
    checklist,
  };
}

export function auditProjectProfile(input: {
  projectId: string;
  revisionId: string;
  name: string;
  kind: ProjectKind;
  fields: Readonly<Record<string, string>>;
  actor: string;
  auditedAt: string;
}): ProjectProfileAuditRecord {
  const fieldFingerprints = computeProfileFieldFingerprints(input.fields);
  const contentSignature = computeProfileContentSignature({
    name: input.name,
    kind: input.kind,
    fields: input.fields,
  });

  const fieldResults: Record<string, ProjectProfileAuditFieldResult> = {};
  const recommendations: string[] = [];
  let score = 0;
  let passedCount = 0;

  for (const def of PROFILE_FIELD_DEFINITIONS) {
    const evalResult = evaluateProfileField(def, input.fields[def.key]);
    if (evalResult.filled) {
      score += def.weight;
      passedCount += 1;
      fieldResults[def.key] = {
        passed: true,
        message: `${def.label}: verified detail sufficiency (${evalResult.charCount} chars).`,
      };
    } else {
      fieldResults[def.key] = {
        passed: false,
        message: `${def.label}: ${evalResult.detailReason}`,
      };
      recommendations.push(`${def.label}: ${evalResult.detailReason}`);
    }
  }

  const vaultDocs = parseVaultDocs(input.fields.vaultDocs);
  if (vaultDocs.length === 0) {
    recommendations.push(
      'Reference documents: attach supporting files with the paperclip picker so reviewers can inspect evidence.'
    );
  }
  if ((input.fields.problem ?? '').trim().length >= 200 && !/\d/.test(input.fields.problem ?? '')) {
    recommendations.push(
      'Problem evidence: include quantitative baseline numbers or percentages to strengthen funder review.'
    );
  }
  if ((input.fields.budget ?? '').trim().length >= 80 && !/\d/.test(input.fields.budget ?? '')) {
    recommendations.push(
      'Budget: include explicit currency amounts or cost-share figures for financial review.'
    );
  }

  return {
    projectId: input.projectId.trim(),
    revisionId: input.revisionId.trim() || 'draft',
    contentSignature,
    fieldFingerprints,
    auditedAt: input.auditedAt,
    actor: input.actor.trim() || 'Founder Lead',
    score,
    passedCount,
    totalCount: PROFILE_FIELD_DEFINITIONS.length,
    allPassed: passedCount === PROFILE_FIELD_DEFINITIONS.length,
    fieldResults,
    recommendations,
  };
}

export function isProfileAuditMap(
  value: unknown
): value is Record<string, ProjectProfileAuditRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100) return false;
  return entries.every(([projectId, record]) => {
    if (!projectId.trim() || !record || typeof record !== 'object' || Array.isArray(record)) {
      return false;
    }
    const r = record as Partial<ProjectProfileAuditRecord>;
    if (
      r.projectId !== projectId ||
      typeof r.revisionId !== 'string' ||
      typeof r.contentSignature !== 'string' ||
      typeof r.auditedAt !== 'string' ||
      typeof r.actor !== 'string' ||
      typeof r.score !== 'number' ||
      !Number.isFinite(r.score) ||
      typeof r.passedCount !== 'number' ||
      !Number.isFinite(r.passedCount) ||
      typeof r.totalCount !== 'number' ||
      !Number.isFinite(r.totalCount) ||
      typeof r.allPassed !== 'boolean' ||
      !r.fieldFingerprints ||
      typeof r.fieldFingerprints !== 'object' ||
      Array.isArray(r.fieldFingerprints) ||
      !r.fieldResults ||
      typeof r.fieldResults !== 'object' ||
      Array.isArray(r.fieldResults) ||
      !Array.isArray(r.recommendations) ||
      !r.recommendations.every((item) => typeof item === 'string')
    ) {
      return false;
    }
    const validFingerprints = Object.values(r.fieldFingerprints).every(
      (v) => typeof v === 'string'
    );
    const validResults = Object.values(r.fieldResults).every(
      (entry) =>
        Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)) &&
        typeof entry.passed === 'boolean' &&
        typeof entry.message === 'string'
    );
    return validFingerprints && validResults;
  });
}
