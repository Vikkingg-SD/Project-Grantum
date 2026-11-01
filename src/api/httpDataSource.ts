import { apiClientOptions, ApiError, createApiClient } from './client';
import { ENDPOINTS } from './endpoint';
import { useAuthStore } from '@/store/useAuthStore';
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

export function createHttpDataSource(request: ReturnType<typeof createApiClient>): DataSource {
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
  createApiClient({ ...apiClientOptions(), getToken: () => useAuthStore.getState().token })
);
