import type { Grant, GrantDetail } from './grant';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';
export type ScoreTier = 'verified' | 'pending' | 'failure';

export interface AuditEvent {
  id: string;
  agent: 'agent-1-narrative' | 'agent-2-deterministic' | 'system';
  message: string;
  status: 'running' | 'passed' | 'failed';
  timestamp: string;
}

export interface ProposalDraft {
  id: string;
  grantId: string;
  completedSections: string[];
  requiredSections: string[];
  completionPct: number;
  confidenceScore: number;
  body: string;
}

export type SectionAction =
  | 'markMissing'
  | 'restoreAll'
  | 'addRequirement'
  | 'deleteRequirement'
  | 'remove'
  | 'add'
  | 'restore';

export interface SectionMutation {
  action: SectionAction;
  sectionName?: string;
}

export interface SectionState {
  grantId: string;
  completedSections: string[];
  requiredSections: string[];
  confidenceScore: number;
  updatedAt: string;
}

export interface AuditScan {
  scanId: string;
  status: 'running' | 'passed' | 'failed';
  confidenceScore: number;
  missingSections: string[];
  events: AuditEvent[];
}

export type AuditScanResponse = AuditScan;

export type ExportFormat = 'word' | 'pdf' | 'notebook' | 'markdown';

export interface ExportRequest {
  format: ExportFormat;
  documentBody: string;
}

export interface ExportResponse {
  success: boolean;
  checksum: string;
  downloadUrl: string;
}

export interface AwardRecord {
  grantId: string;
  status: 'awarded' | 'submitted' | 'in_review';
  submittedAt: string;
  nextReportAt: string;
  amount: string;
  contractStatus: string;
  events: AuditEvent[];
}

export interface FunnelStage {
  label: string;
  count: number;
}

export interface DashboardSummary {
  greetingName: string;
  pipeline: FunnelStage[];
  profileCompletionPct: number;
  activeDraft: {
    grantId: string;
    title: string;
    completionPct: number;
  } | null;
}

export interface GrantSearchParams {
  q?: string;
  region?: string[];
  category?: string[];
}

export interface AuthMe {
  id: string;
  isOnboarded: boolean;
  status: 'active' | 'suspended';
}

export interface OAuthResult {
  token: string;
  isNewUser: boolean;
}

export interface BountyInput {
  title: string;
  url?: string;
  note?: string;
}

export interface DataSource {
  getGrants(params?: GrantSearchParams): Promise<Grant[]>;
  getGrant(id: string): Promise<GrantDetail>;
  getProposalDraft(grantId: string): Promise<ProposalDraft>;
  mutateSections(grantId: string, input: SectionMutation): Promise<SectionState>;
  runAudit(grantId: string): Promise<AuditScan>;
  getAuditScan(grantId: string, scanId: string): Promise<AuditScan>;
  getLatestAuditScan(grantId: string): Promise<AuditScan | null>;
  exportBundle(grantId: string, input: ExportRequest): Promise<ExportResponse>;
  getAward(grantId: string): Promise<AwardRecord>;
  getDashboardSummary(): Promise<DashboardSummary>;
  getMe(): Promise<AuthMe>;
  sendMagicLink(email: string): Promise<{ success: true }>;
  oauthLogin(provider: string): Promise<OAuthResult>;
  finishOnboarding(): Promise<{ success: true; isOnboarded: true }>;
  submitBounty(input: BountyInput): Promise<{ queued: true }>;
}

export interface ChatMessage {
  id: string;
  text: string;
  variant: 'user' | 'assistant-narrative' | 'assistant-auditor' | 'system';
  timestamp?: string;
  status?: 'sending' | 'sent' | 'error';
}
