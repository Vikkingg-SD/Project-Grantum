import { create } from 'zustand';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';
import { draftConfidenceScore } from '@/utils/scoring';
import type { ChatEntry } from '@/types/chat';
import { generateId } from '@/utils/uuid';

interface DraftState {
  completedSections: string[];
  requiredSections: string[];
  confidenceScore: number;
  draftingMessages: ChatEntry[];
  auditMessages: ChatEntry[];
  exportDocument: string;
  isScanning: boolean;
  removeCompletedSection: (name: string) => void;
  restoreCompletedSections: () => void;
  addRequiredSection: (name: string) => void;
  deleteRequiredSection: (name: string) => void;
  addDraftingMessage: (text: string, variant: ChatEntry['variant']) => void;
  addAuditMessage: (text: string, variant: ChatEntry['variant']) => void;
  setExportDocument: (doc: string) => void;
  setScanning: (status: boolean) => void;
  resetDraftForGrant: (grantId: string, grantTitle: string, funder: string) => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  completedSections: [...DEFAULT_REQUIRED_SECTIONS],
  requiredSections: [...DEFAULT_REQUIRED_SECTIONS],
  confidenceScore: 100,
  draftingMessages: [
    {
      id: 'init-draft',
      text: 'Welcome to the drafting assistant. Narrative generation armed.',
      variant: 'assistant-narrative',
      timestamp: 'now',
    },
  ],
  auditMessages: [
    {
      id: 'init-audit',
      text: 'AUDIT AGENT ONLINE · Deterministic pass armed. Awaiting compliance check.',
      variant: 'assistant-auditor',
      timestamp: 'now',
    },
  ],
  exportDocument: 'Executive summary\n\nGrantum Autonomous Proposal System initialized.',
  isScanning: false,
  removeCompletedSection: (name) => {
    const { completedSections, requiredSections } = get();
    const nextCompleted = completedSections.filter((s) => s !== name);
    set({
      completedSections: nextCompleted,
      confidenceScore: draftConfidenceScore(nextCompleted, requiredSections),
    });
  },
  restoreCompletedSections: () => {
    const { requiredSections } = get();
    set({
      completedSections: [...requiredSections],
      confidenceScore: 100,
    });
  },
  addRequiredSection: (name) => {
    if (!name.trim()) return;
    const { completedSections, requiredSections } = get();
    if (requiredSections.includes(name)) return;
    const nextRequired = [...requiredSections, name.trim()];
    const nextCompleted = [...completedSections, name.trim()];
    set({
      requiredSections: nextRequired,
      completedSections: nextCompleted,
      confidenceScore: draftConfidenceScore(nextCompleted, nextRequired),
    });
  },
  deleteRequiredSection: (name) => {
    const { completedSections, requiredSections } = get();
    const nextRequired = requiredSections.filter((s) => s !== name);
    const nextCompleted = completedSections.filter((s) => s !== name);
    set({
      requiredSections: nextRequired,
      completedSections: nextCompleted,
      confidenceScore: draftConfidenceScore(nextCompleted, nextRequired),
    });
  },
  addDraftingMessage: (text, variant) => {
    set((state) => ({
      draftingMessages: [
        ...state.draftingMessages,
        { id: generateId('msg'), text, variant, timestamp: 'now' },
      ],
    }));
  },
  addAuditMessage: (text, variant) => {
    set((state) => ({
      auditMessages: [
        ...state.auditMessages,
        { id: generateId('msg'), text, variant, timestamp: 'now' },
      ],
    }));
  },
  setExportDocument: (doc) => set({ exportDocument: doc }),
  setScanning: (status) => set({ isScanning: status }),
  resetDraftForGrant: (grantId, grantTitle, funder) => {
    set({
      completedSections: [...DEFAULT_REQUIRED_SECTIONS],
      requiredSections: [...DEFAULT_REQUIRED_SECTIONS],
      confidenceScore: 100,
      exportDocument: `Executive summary\n\n${grantTitle} seeks allocation from ${funder}. Verified audit trace anchored.`,
      draftingMessages: [
        {
          id: generateId('msg'),
          text: `Welcome to the drafting assistant. Current file: ${grantTitle} (${funder}). Describe revisions to align with requirements.`,
          variant: 'assistant-narrative',
          timestamp: 'now',
        },
      ],
    });
  },
}));
