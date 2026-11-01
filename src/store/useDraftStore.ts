import { create } from 'zustand';
import type { ChatEntry } from '@/types/chat';
import { generateId } from '@/utils/uuid';

export interface GrantDraftState {
  draftingMessages: ChatEntry[];
  auditMessages: ChatEntry[];
  exportDocument: string | null;
}
interface DraftStoreState {
  drafts: Record<string, GrantDraftState>;
  ensureDraft: (grantId: string, grantTitle?: string, funder?: string) => void;
  getDraft: (grantId: string) => GrantDraftState;
  addDraftingMessage: (grantId: string, text: string, variant: ChatEntry['variant']) => void;
  addAuditMessage: (grantId: string, text: string, variant: ChatEntry['variant']) => void;
  setExportDocument: (grantId: string, doc: string) => void;
  resetDraftForGrant: (grantId: string, grantTitle: string, funder: string) => void;
}
const empty = (): GrantDraftState => ({
  draftingMessages: [],
  auditMessages: [],
  exportDocument: null,
});
export const EMPTY_DRAFT: GrantDraftState = Object.freeze(empty());
export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {},
  ensureDraft: (grantId) => {
    if (!grantId || get().drafts[grantId]) return;
    set((state) => ({ drafts: { ...state.drafts, [grantId]: empty() } }));
  },
  getDraft: (grantId) => get().drafts[grantId] ?? EMPTY_DRAFT,
  addDraftingMessage: (grantId, text, variant) => {
    if (!grantId || !text.trim()) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: {
          ...draft,
          draftingMessages: [...draft.draftingMessages, { id: generateId('msg'), text, variant }],
        },
      },
    }));
  },
  addAuditMessage: (grantId, text, variant) => {
    if (!grantId || !text.trim()) return;
    const draft = get().getDraft(grantId);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [grantId]: {
          ...draft,
          auditMessages: [...draft.auditMessages, { id: generateId('msg'), text, variant }],
        },
      },
    }));
  },
  setExportDocument: (grantId, exportDocument) => {
    if (!grantId) return;
    const draft = get().getDraft(grantId);
    set((state) => ({ drafts: { ...state.drafts, [grantId]: { ...draft, exportDocument } } }));
  },
  resetDraftForGrant: (grantId) => {
    if (!grantId) return;
    set((state) => ({ drafts: { ...state.drafts, [grantId]: empty() } }));
  },
}));
