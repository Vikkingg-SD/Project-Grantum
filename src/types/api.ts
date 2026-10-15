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

export interface AuditScanResponse {
  scanId: string;
  status: 'running' | 'passed' | 'failed';
  confidenceScore: number;
  missingSections: string[];
  events: AuditEvent[];
}

export interface ExportResponse {
  success: boolean;
  checksum: string;
  downloadUrl: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  variant: 'user' | 'assistant-narrative' | 'assistant-auditor' | 'system';
  timestamp?: string;
  status?: 'sending' | 'sent' | 'error';
}
