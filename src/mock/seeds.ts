import type { Grant } from '@/types/grant';
import type { ChatEntry } from '@/types/chat';

export function seedDraftingMessages(grant: Grant): ChatEntry[] {
  return [
    {
      id: `drafting-welcome-${grant.id}`,
      text: `Welcome to the drafting assistant. Current file: ${grant.title} (${grant.funder}). Tell me what your project needs to change, and I will keep the narrative aligned to the funder requirements.`,
      variant: 'assistant-narrative',
      timestamp: 'now',
    },
  ];
}

export function seedAuditMessages(grant: Grant): ChatEntry[] {
  return [
    {
      id: `audit-welcome-${grant.id}`,
      text: 'AUDIT AGENT ONLINE · deterministic pass armed. Ask me to verify budget math, eligibility windows, or evidence references.',
      variant: 'assistant-auditor',
      timestamp: 'now',
    },
  ];
}

export function seedExportDoc(grant: Grant): string {
  return `Executive summary\n\n${grant.title} seeks ${grant.amount} — ${grant.summary}`;
}
