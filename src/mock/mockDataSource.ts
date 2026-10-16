import type {
  DataSource,
  GrantSearchParams,
  SectionMutation,
  ExportRequest,
  BountyInput,
} from '@/types/api';
import { mockGrants } from './grants';
import { mockDashboardSummary } from './dashboard';
import {
  getMockGrantDetail,
  getMockDraft,
  updateMockDraft,
  createMockScan,
  getMockScan,
  getMockAward,
} from './db';
import { applySectionMutation } from '@/utils/scoring';
import { ENV } from '@/config/env';
import { filterGrants } from '@/utils/filters';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockDataSource: DataSource = {
  async getGrants(params?: GrantSearchParams) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return filterGrants(mockGrants, {
      query: params?.q,
      regions: params?.region,
      categories: params?.category,
    });
  },
  async getGrant(id: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return getMockGrantDetail(id);
  },
  async getProposalDraft(grantId: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return getMockDraft(grantId);
  },
  async mutateSections(grantId: string, input: SectionMutation) {
    await sleep(ENV.MOCK_LATENCY_MS);
    const draft = getMockDraft(grantId);
    const next = applySectionMutation(draft, input);
    updateMockDraft(grantId, next);
    return {
      grantId,
      completedSections: next.completedSections,
      requiredSections: next.requiredSections,
      confidenceScore: next.confidenceScore,
      updatedAt: new Date().toISOString(),
    };
  },
  async runAudit(grantId: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return createMockScan(grantId);
  },
  async getAuditScan(_grantId: string, scanId: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    const scan = getMockScan(scanId);
    if (!scan) throw new Error('Scan not found');
    return scan;
  },
  async exportBundle(grantId: string, input: ExportRequest) {
    await sleep(ENV.MOCK_LATENCY_MS);
    updateMockDraft(grantId, { body: input.documentBody });
    return {
      success: true,
      checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      downloadUrl: `https://api.grantum.io/downloads/bundle-${grantId}.${input.format}`,
    };
  },
  async getAward(grantId: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return getMockAward(grantId);
  },
  async getDashboardSummary() {
    await sleep(ENV.MOCK_LATENCY_MS);
    return mockDashboardSummary;
  },
  async getMe() {
    await sleep(ENV.MOCK_LATENCY_MS);
    return { id: 'u1', isOnboarded: true, status: 'active' as const };
  },
  async sendMagicLink(_email: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return { success: true as const };
  },
  async oauthLogin(_provider: string) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return { token: 'mock-token', isNewUser: false };
  },
  async finishOnboarding() {
    await sleep(ENV.MOCK_LATENCY_MS);
    return { success: true as const, isOnboarded: true as const };
  },
  async submitBounty(_input: BountyInput) {
    await sleep(ENV.MOCK_LATENCY_MS);
    return { queued: true as const };
  },
};
