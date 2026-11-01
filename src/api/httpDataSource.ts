import { apiClientOptions, ApiError, createApiClient } from './client';
import { ENDPOINTS } from './endpoint';
import { getSessionToken } from '@/store/useAuthStore';
import type { DataSource, SectionMutation } from '@/types/api';

function wireMutation(input: SectionMutation): SectionMutation {
  const actions = {
    markMissing: 'remove',
    restoreAll: 'restore',
    addRequirement: 'add',
    deleteRequirement: 'deleteRequirement',
    remove: 'remove',
    add: 'add',
    restore: 'restore',
  } as const;
  const action = actions[input.action];
  if (action !== 'restore' && !input.sectionName?.trim()) {
    throw new ApiError('A section name is required.', 0, 'VALIDATION');
  }
  return { action, ...(input.sectionName ? { sectionName: input.sectionName.trim() } : {}) };
}

type Check = (value: unknown) => boolean;
const text: Check = (value) => typeof value === 'string';
const identifier: Check = (value) => typeof value === 'string' && value.trim().length > 0;
const percentage: Check = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const boolean: Check = (value) => typeof value === 'boolean';
const array =
  (check: Check): Check =>
  (value) =>
    Array.isArray(value) && value.every(check);
const enumeration =
  (...values: string[]): Check =>
  (value) =>
    typeof value === 'string' && values.includes(value);
const shape =
  (fields: Record<string, Check>): Check =>
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(fields).every(([key, check]) => check((value as Record<string, unknown>)[key]));
const date: Check = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const grant = {
  id: identifier,
  title: identifier,
  funder: text,
  deadline: text,
  amount: text,
  matchPct: percentage,
  region: text,
  summary: text,
};
const event = shape({
  id: identifier,
  agent: enumeration('agent-1-narrative', 'agent-2-deterministic', 'system'),
  message: text,
  status: enumeration('running', 'passed', 'failed'),
  timestamp: text,
});
const scan = shape({
  scanId: identifier,
  status: enumeration('running', 'passed', 'failed'),
  confidenceScore: percentage,
  missingSections: array(text),
  events: array(event),
});

function validPayload(path: string, value: unknown): boolean {
  const route = path.split('?')[0];
  const proposalId = /^\/api\/v1\/proposals\/([^/]+)\//.exec(route)?.[1];
  if (
    proposalId &&
    typeof value === 'object' &&
    value !== null &&
    'grantId' in value &&
    value.grantId !== decodeURIComponent(proposalId)
  )
    return false;
  if (route === '/api/v1/grants') return array(shape(grant))(value);
  if (/^\/api\/v1\/grants\/[^/]+$/.test(route))
    return shape({
      ...grant,
      id: (item) => item === decodeURIComponent(route.split('/')[4]),
      requirements: array(text),
    })(value);
  if (route.endsWith('/draft'))
    return shape({
      id: identifier,
      grantId: identifier,
      completedSections: array(text),
      requiredSections: array(text),
      completionPct: percentage,
      confidenceScore: percentage,
      body: text,
    })(value);
  if (route.endsWith('/sections'))
    return shape({
      grantId: identifier,
      completedSections: array(text),
      requiredSections: array(text),
      confidenceScore: percentage,
      updatedAt: date,
    })(value);
  if (route.endsWith('/audit/latest') && value === null) return true;
  if (/\/audit(?:\/[^/]+)?$/.test(route)) return scan(value);
  if (route.endsWith('/export'))
    return shape({
      success: (item) => item === true,
      checksum: identifier,
      downloadUrl: (item) => typeof item === 'string' && /^https?:\/\//i.test(item),
    })(value);
  if (route.endsWith('/award'))
    return shape({
      grantId: identifier,
      status: enumeration('awarded', 'submitted', 'in_review'),
      submittedAt: date,
      nextReportAt: date,
      amount: text,
      contractStatus: text,
      events: array(event),
    })(value);
  if (route === ENDPOINTS.dashboard)
    return shape({
      greetingName: text,
      pipeline: array(
        shape({
          label: text,
          count: (item) => typeof item === 'number' && Number.isInteger(item) && item >= 0,
        })
      ),
      profileCompletionPct: percentage,
      activeDraft: (item) =>
        item === null ||
        shape({ grantId: identifier, title: text, completionPct: percentage })(item),
    })(value);
  if (route === ENDPOINTS.me)
    return shape({
      id: identifier,
      isOnboarded: boolean,
      status: enumeration('active', 'suspended'),
    })(value);
  if (route === ENDPOINTS.oauth) return shape({ token: identifier, isNewUser: boolean })(value);
  if (route === ENDPOINTS.magicLink) return shape({ success: (item) => item === true })(value);
  if (route === ENDPOINTS.onboarding)
    return shape({ success: (item) => item === true, isOnboarded: (item) => item === true })(value);
  if (route === ENDPOINTS.bounty) return shape({ queued: (item) => item === true })(value);
  return false;
}

export function createHttpDataSource(transport: ReturnType<typeof createApiClient>): DataSource {
  async function request<T>(path: string, options?: Parameters<typeof transport>[1]): Promise<T> {
    const value = await transport<unknown>(path, options);
    if (!validPayload(path, value))
      throw new ApiError('The server returned an invalid response.', 0, 'INVALID_RESPONSE');
    return value as T;
  }
  return {
    getGrants: (params) => request(ENDPOINTS.grants(params)),
    getGrant: (grantId) => request(ENDPOINTS.grant(grantId)),
    getProposalDraft: (grantId) => request(ENDPOINTS.draft(grantId)),
    mutateSections: (grantId, input) =>
      request(ENDPOINTS.sections(grantId), { method: 'PATCH', body: wireMutation(input) }),
    runAudit: (grantId) =>
      request(ENDPOINTS.audit(grantId), { method: 'POST', body: { triggerMode: 'full_scan' } }),
    getAuditScan: (grantId, scanId) => request(ENDPOINTS.auditScan(grantId, scanId)),
    getLatestAuditScan: (grantId) => request(ENDPOINTS.auditScan(grantId, 'latest')),
    exportBundle: (grantId, input) =>
      request(ENDPOINTS.export(grantId), { method: 'POST', body: input }),
    getAward: (grantId) => request(ENDPOINTS.award(grantId)),
    getDashboardSummary: () => request(ENDPOINTS.dashboard),
    getMe: () => request(ENDPOINTS.me),
    sendMagicLink: (email) =>
      request(ENDPOINTS.magicLink, { method: 'POST', body: { email }, public: true }),
    oauthLogin: (provider) =>
      request(ENDPOINTS.oauth, { method: 'POST', body: { provider }, public: true }),
    finishOnboarding: () => request(ENDPOINTS.onboarding, { method: 'POST' }),
    submitBounty: (input) => request(ENDPOINTS.bounty, { method: 'POST', body: input }),
  };
}

export const httpDataSource = createHttpDataSource(
  createApiClient({ ...apiClientOptions(), getToken: getSessionToken })
);
