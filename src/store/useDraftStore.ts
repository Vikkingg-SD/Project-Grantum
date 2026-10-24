import { create } from 'zustand';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';
import type { ChatEntry } from '@/types/chat';
import { generateId } from '@/utils/uuid';

export interface GrantDraftState {
  completedSections: string[];
  requiredSections: string[];
  draftingMessages: ChatEntry[];
  auditMessages: ChatEntry[];
  exportDocument: string;
  isScanning: boolean;
}

interface DraftStoreState {
  drafts: Record<string, GrantDraftState>;
  ensureDraft: (grantId: string, grantTitle?: string, funder?: string) => void;
  getDraft: (grantId: string) => GrantDraftState;
  removeCompletedSection: (grantId: string, name: string) => void;
  restoreCompletedSections: (grantId: string) => void;
  addRequiredSection: (grantId: string, name: string) => void;
  deleteRequiredSection: (grantId: string, name: string) => void;
  addDraftingMessage: (grantId: string, text: string, variant: ChatEntry['variant']) => void;
  addAuditMessage: (grantId: string, text: string, variant: ChatEntry['variant']) => void;
  setExportDocument: (grantId: string, doc: string) => void;
  setScanning: (grantId: string, status: boolean) => void;
  resetDraftForGrant: (grantId: string, grantTitle: string, funder: string) => void;
}

const createDefaultDraft = (grantTitle?: string, funder?: string): GrantDraftState => ({
  completedSections: [...DEFAULT_REQUIRED_SECTIONS],
  requiredSections: [...DEFAULT_REQUIRED_SECTIONS],
  draftingMessages: [
    {
      id: generateId('msg'),
      text: grantTitle
        ? `Welcome to the drafting assistant. Current file: ${grantTitle} (${funder}). Describe revisions to align with requirements.`
        : 'Welcome to the drafting assistant. Narrative generation armed.',
      variant: 'assistant-narrative',
      timestamp: 'now',
    },
  ],
  auditMessages: [
    {
      id: generateId('msg'),
      text: 'AUDIT AGENT ONLINE · Deterministic pass armed. Awaiting compliance check.',
      variant: 'assistant-auditor',
      timestamp: 'now',
    },
  ],
  exportDocument: grantTitle
    ? `Executive summary\n\n${grantTitle} seeks allocation from ${funder}. Verified audit trace anchored.`
    : 'Executive summary\n\nGrantum Autonomous Proposal System initialized.',
  isScanning: false,
});

export const EMPTY_DRAFT: GrantDraftState = Object.freeze({
  completedSections: [],
  requiredSections: [],
  draftingMessages: [],
  auditMessages: [],
  exportDocument: '',
  isScanning: false,
});

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {
    '1': createDefaultDraft('Climate Resilience Infrastructure', 'Northstar Foundation'),
  },
  ensureDraft: (grantId, grantTitle, funder) => {
    if (!grantId) return;
    if (!get().drafts[grantId]) {
      set((state) => ({
        drafts: { ...state.drafts, [grantId]: createDefaultDraft(grantTitle, funder) },
      }));
    }
  },
  getDraft: (grantId) => get().drafts[grantId] ?? EMPTY_DRAFT,
  removeCompletedSection: (grantId, name) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    const nextCompleted = draft.completedSections.filter((s) => s !== name);
    set((state) => ({
      drafts: { ...state.drafts, [grantId]: { ...draft, completedSections: nextCompleted } },
    }));
  },
  restoreCompletedSections: (grantId) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: { ...draft, completedSections: [...draft.requiredSections] },
      },
    }));
  },
  addRequiredSection: (grantId, name) => {
    if (!grantId) return;
    if (!name.trim()) return;
    const draft = get().getDraft(grantId);
    if (draft.requiredSections.includes(name)) return;
    const nextRequired = [...draft.requiredSections, name.trim()];
    const nextCompleted = [...draft.completedSections, name.trim()];
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: { ...draft, requiredSections: nextRequired, completedSections: nextCompleted },
      },
    }));
  },
  deleteRequiredSection: (grantId, name) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    const nextRequired = draft.requiredSections.filter((s) => s !== name);
    const nextCompleted = draft.completedSections.filter((s) => s !== name);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: { ...draft, requiredSections: nextRequired, completedSections: nextCompleted },
      },
    }));
  },
  addDraftingMessage: (grantId, text, variant) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: {
          ...draft,
          draftingMessages: [
            ...draft.draftingMessages,
            { id: generateId('msg'), text, variant, timestamp: 'now' },
          ],
        },
      },
    }));
  },
  addAuditMessage: (grantId, text, variant) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: {
          ...draft,
          auditMessages: [
            ...draft.auditMessages,
            { id: generateId('msg'), text, variant, timestamp: 'now' },
          ],
        },
      },
    }));
  },
  setExportDocument: (grantId, doc) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: { ...state.drafts, [grantId]: { ...draft, exportDocument: doc } },
    }));
  },
  setScanning: (grantId, status) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: { ...state.drafts, [grantId]: { ...draft, isScanning: status } },
    }));
  },
  resetDraftForGrant: (grantId, grantTitle, funder) => {
    if (!grantId) return;
    set((state) => ({
      drafts: { ...state.drafts, [grantId]: createDefaultDraft(grantTitle, funder) },
    }));
  },
}));
