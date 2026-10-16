import type { GrantDetail } from '@/types/grant';
import type { ProposalDraft, AuditScan, AwardRecord, AuditEvent } from '@/types/api';
import { mockGrants } from './grants';
import { seedExportDoc } from './seeds';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';
import { draftConfidenceScore } from '@/utils/scoring';
import { generateId } from '@/utils/uuid';

const drafts: Record<string, ProposalDraft> = {};
const scans: Record<string, AuditScan> = {};

export function getMockGrantDetail(id: string): GrantDetail {
  const grant = mockGrants.find((g) => g.id === id) ?? mockGrants[0];
  return { ...grant, requirements: [...DEFAULT_REQUIRED_SECTIONS] };
}

export function getMockDraft(grantId: string): ProposalDraft {
  if (!drafts[grantId]) {
    drafts[grantId] = {
      id: `prop-${grantId}`,
      grantId,
      completedSections: [...DEFAULT_REQUIRED_SECTIONS],
      requiredSections: [...DEFAULT_REQUIRED_SECTIONS],
      completionPct: 42,
      confidenceScore: 100,
      body: seedExportDoc(mockGrants.find((g) => g.id === grantId) ?? mockGrants[0]),
    };
  }
  return drafts[grantId];
}

export function updateMockDraft(grantId: string, update: Partial<ProposalDraft>): ProposalDraft {
  const current = getMockDraft(grantId);
  const next = { ...current, ...update };
  drafts[grantId] = next;
  return next;
}

export function createMockScan(grantId: string): AuditScan {
  const draft = getMockDraft(grantId);
  const scanId = generateId('scan');
  const missing = draft.requiredSections.filter((s) => !draft.completedSections.includes(s));
  const events: AuditEvent[] = [
    {
      id: generateId('evt'),
      agent: 'agent-2-deterministic',
      message: missing.length === 0 ? 'All sections verified' : `Missing: ${missing.join(', ')}`,
      status: missing.length === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
    },
  ];
  const scan: AuditScan = {
    scanId,
    status: 'running',
    confidenceScore: draftConfidenceScore(draft.completedSections, draft.requiredSections),
    missingSections: missing,
    events,
  };
  scans[scanId] = scan;
  return scan;
}

export function getMockScan(scanId: string): AuditScan | undefined {
  const scan = scans[scanId];
  if (scan && scan.status === 'running') {
    scan.status = scan.missingSections.length === 0 ? 'passed' : 'failed';
  }
  return scan;
}

export function getMockAward(grantId: string): AwardRecord {
  return {
    grantId,
    status: 'awarded',
    submittedAt: '2026-05-18T14:30:00Z',
    nextReportAt: '2026-08-14T00:00:00Z',
    amount: '$250k–$500k',
    contractStatus: 'Contract countersigned',
    events: [
      {
        id: '1',
        agent: 'agent-2-deterministic',
        message: 'Final budget reconciliation passed',
        status: 'passed',
        timestamp: '18 May · 14:32',
      },
      {
        id: '2',
        agent: 'agent-1-narrative',
        message: 'Evidence references locked',
        status: 'passed',
        timestamp: '18 May · 14:31',
      },
      {
        id: '3',
        agent: 'system',
        message: 'Submission receipt stored',
        status: 'passed',
        timestamp: '18 May · 14:30',
      },
    ],
  };
}
