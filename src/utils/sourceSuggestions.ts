export type SourceModerationStatus =
  | 'draft'
  | 'submitting'
  | 'pending-review'
  | 'changes-requested'
  | 'accepted'
  | 'declined'
  | 'submission-failed';

export type SourceLinkVerificationStatus =
  'empty' | 'invalid-syntax' | 'unconfirmed-host' | 'confirmed';

export interface SourceLinkVerificationResult {
  status: SourceLinkVerificationStatus;
  normalizedUrl?: string;
  redirectedFrom?: string;
  message: string;
}

export interface BountyFormInput {
  title: string;
  url: string;
  region: string;
  prizePool: string;
  mission: string;
  note: string;
}

export type BountyValidationErrors = Record<keyof BountyFormInput, string>;

export interface SourceSuggestion {
  id: string;
  title: string;
  url: string;
  note: string;
  createdAt: string;
  region?: string;
  prizePool?: string;
  mission?: string;
  submissionId?: string;
  receiptId?: string;
  moderationStatus?: SourceModerationStatus;
  moderationNote?: string;
  updatedAt?: string;
  submittedAt?: string;
  bountyEligible?: boolean;
  rewardGranted?: boolean;
}

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LABEL_PATTERN = /^[a-z0-9-]+$/i;
const TLD_PATTERN = /^[a-z]{2,24}$/i;
const REDIRECT_PARAM_NAMES = [
  'redirect',
  'url',
  'to',
  'target',
  'next',
  'dest',
  'returnUrl',
  'continue',
] as const;
const SCHEME_PREFIX_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const RESERVED_TLDS = new Set([
  'invalid',
  'test',
  'localhost',
  'local',
  'internal',
  'onion',
  'arpa',
  'example',
]);

const UNCONFIRMED_DOMAINS = new Set([
  'bullshit.com',
  'whatever.com',
  'fake.com',
  'asdf.com',
  'qwerty.com',
  'test.com',
  'invalid.com',
  'nonexistent.com',
  'placeholder.com',
  'unavailable.org',
  'unreachable.org',
  'deadlink.org',
]);

const INSTITUTIONAL_DOMAIN_PATTERN =
  /\.(org|gov|edu|eu|int|ac|mil|foundation|trust|[a-z]{2}\.(gov|org|edu|ac)|gov\.[a-z]{2}|org\.[a-z]{2}|edu\.[a-z]{2}|ac\.[a-z]{2})$/i;

const MODERATION_STATUSES = new Set<SourceModerationStatus>([
  'draft',
  'submitting',
  'pending-review',
  'changes-requested',
  'accepted',
  'declined',
  'submission-failed',
]);

function isValidPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host.length > 253 || !host.includes('.')) return false;
  if (host.includes(':') || host.startsWith('[') || IPV4_PATTERN.test(host)) return false;
  const labels = host.split('.');
  if (labels.some((label) => !label || label.length > 63 || !LABEL_PATTERN.test(label))) {
    return false;
  }
  if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) {
    return false;
  }
  const tld = labels[labels.length - 1];
  if (!TLD_PATTERN.test(tld) || RESERVED_TLDS.has(tld)) return false;
  return true;
}

function isUnconfirmedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  for (const domain of UNCONFIRMED_DOMAINS) {
    if (host === domain || host.endsWith(`.${domain}`)) return true;
  }
  return false;
}

function verifySourceLinkInternal(value: string, depth: number): SourceLinkVerificationResult {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return {
      status: 'empty',
      message: 'Enter a full HTTPS source URL without sign-in details.',
    };
  }
  if (value.length > 2048 || /\s/.test(trimmed) || CONTROL_CHAR_PATTERN.test(value)) {
    return {
      status: 'invalid-syntax',
      message: 'Enter a full HTTPS source URL without sign-in details.',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      status: 'invalid-syntax',
      message: 'Enter a full HTTPS source URL without sign-in details.',
    };
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    return {
      status: 'invalid-syntax',
      message: 'Enter a full HTTPS source URL without sign-in details.',
    };
  }
  if (!isValidPublicHost(parsed.hostname)) {
    return {
      status: 'unconfirmed-host',
      message:
        'This domain cannot be confirmed as a reachable public source. Use an official funding URL.',
    };
  }
  if (isUnconfirmedHost(parsed.hostname)) {
    return {
      status: 'unconfirmed-host',
      message:
        'This domain cannot be confirmed as an official funding source. Use a verifiable grant portal URL.',
    };
  }
  parsed.hash = '';
  const cleanHref = parsed.href;

  for (const key of REDIRECT_PARAM_NAMES) {
    const target = parsed.searchParams.get(key)?.trim();
    if (target && SCHEME_PREFIX_PATTERN.test(target)) {
      if (depth >= 2) {
        return {
          status: 'unconfirmed-host',
          message: 'Redirect chain is too deep or points to an unconfirmed destination.',
        };
      }
      const inner = verifySourceLinkInternal(target, depth + 1);
      if (inner.status !== 'confirmed' || !inner.normalizedUrl) {
        return {
          status: inner.status,
          message: `Redirect destination could not be confirmed: ${inner.message}`,
        };
      }
      return {
        status: 'confirmed',
        normalizedUrl: inner.normalizedUrl,
        redirectedFrom: cleanHref,
        message: 'Redirect destination confirmed. Open the verified link below before submitting.',
      };
    }
  }

  const cleanPath = parsed.pathname.replace(/\/+$/, '');
  if (!INSTITUTIONAL_DOMAIN_PATTERN.test(parsed.hostname) && cleanPath.length <= 1) {
    return {
      status: 'unconfirmed-host',
      message:
        'Generic domains require a direct funding call path (such as https://portal.com/grants/call). Confirm the official page before submitting.',
    };
  }

  return {
    status: 'confirmed',
    normalizedUrl: cleanHref,
    message: 'Official HTTPS source format confirmed. Open the link below to verify the live page.',
  };
}

export function verifySourceLink(value: string): SourceLinkVerificationResult {
  return verifySourceLinkInternal(value, 0);
}

export function normalizeSourceUrl(value: string): string | undefined {
  const result = verifySourceLink(value);
  return result.status === 'confirmed' ? result.normalizedUrl : undefined;
}

export function validateSource(title: string, url: string, note: string) {
  const linkCheck = verifySourceLink(url);
  return {
    title: !title.trim() || title.trim().length > 160 ? 'Enter a title of 1–160 characters.' : '',
    url: linkCheck.status === 'confirmed' ? '' : linkCheck.message,
    note: note.length > 1000 ? 'Keep the description within 1,000 characters.' : '',
  };
}

export function validateBountySubmission(input: BountyFormInput): BountyValidationErrors {
  const linkCheck = verifySourceLink(input.url);
  const titleTrimmed = input.title.trim();
  const regionTrimmed = input.region.trim();
  const prizeTrimmed = input.prizePool.trim();
  const missionTrimmed = input.mission.trim();
  const noteTrimmed = input.note.trim();
  return {
    title: !titleTrimmed || titleTrimmed.length > 160 ? 'Enter a title of 1–160 characters.' : '',
    url: linkCheck.status === 'confirmed' ? '' : linkCheck.message,
    region:
      !regionTrimmed || regionTrimmed.length > 160
        ? 'Enter the location or region (1–160 characters).'
        : '',
    prizePool:
      !prizeTrimmed || prizeTrimmed.length > 160 ? 'Enter the prize pool or "Not published".' : '',
    mission:
      !missionTrimmed || missionTrimmed.length > 500
        ? 'Enter the opportunity mission (1–500 characters).'
        : '',
    note:
      !noteTrimmed || noteTrimmed.length > 1000
        ? 'Enter what Grantum should also note (1–1,000 characters).'
        : '',
  };
}

export function isBountyComplete(input: Partial<BountyFormInput>): boolean {
  const errors = validateBountySubmission({
    title: input.title ?? '',
    url: input.url ?? '',
    region: input.region ?? '',
    prizePool: input.prizePool ?? '',
    mission: input.mission ?? '',
    note: input.note ?? '',
  });
  return !Object.values(errors).some(Boolean);
}

export function isSourceHistory(value: unknown): value is SourceSuggestion[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      if (
        typeof candidate.id !== 'string' ||
        typeof candidate.title !== 'string' ||
        typeof candidate.url !== 'string' ||
        typeof candidate.note !== 'string' ||
        typeof candidate.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(candidate.createdAt)) ||
        Object.values(validateSource(candidate.title, candidate.url, candidate.note)).some(Boolean)
      ) {
        return false;
      }
      if (
        candidate.region !== undefined &&
        (typeof candidate.region !== 'string' || candidate.region.length > 160)
      ) {
        return false;
      }
      if (
        candidate.prizePool !== undefined &&
        (typeof candidate.prizePool !== 'string' || candidate.prizePool.length > 160)
      ) {
        return false;
      }
      if (
        candidate.mission !== undefined &&
        (typeof candidate.mission !== 'string' || candidate.mission.length > 500)
      ) {
        return false;
      }
      if (
        candidate.submissionId !== undefined &&
        (typeof candidate.submissionId !== 'string' || candidate.submissionId.length > 120)
      ) {
        return false;
      }
      if (
        candidate.receiptId !== undefined &&
        (typeof candidate.receiptId !== 'string' || candidate.receiptId.length > 120)
      ) {
        return false;
      }
      if (
        candidate.moderationStatus !== undefined &&
        (typeof candidate.moderationStatus !== 'string' ||
          !MODERATION_STATUSES.has(candidate.moderationStatus as SourceModerationStatus))
      ) {
        return false;
      }
      if (
        candidate.moderationNote !== undefined &&
        (typeof candidate.moderationNote !== 'string' || candidate.moderationNote.length > 500)
      ) {
        return false;
      }
      if (
        candidate.updatedAt !== undefined &&
        (typeof candidate.updatedAt !== 'string' ||
          !Number.isFinite(Date.parse(candidate.updatedAt)))
      ) {
        return false;
      }
      if (
        candidate.submittedAt !== undefined &&
        (typeof candidate.submittedAt !== 'string' ||
          !Number.isFinite(Date.parse(candidate.submittedAt)))
      ) {
        return false;
      }
      if (candidate.bountyEligible !== undefined && typeof candidate.bountyEligible !== 'boolean') {
        return false;
      }
      if (candidate.rewardGranted !== undefined) {
        if (typeof candidate.rewardGranted !== 'boolean') return false;
        if (
          candidate.rewardGranted &&
          (candidate.moderationStatus !== 'accepted' ||
            !isBountyComplete({
              title: candidate.title,
              url: candidate.url,
              region: typeof candidate.region === 'string' ? candidate.region : '',
              prizePool: typeof candidate.prizePool === 'string' ? candidate.prizePool : '',
              mission: typeof candidate.mission === 'string' ? candidate.mission : '',
              note: candidate.note,
            }))
        ) {
          return false;
        }
      }
      return true;
    })
  );
}
