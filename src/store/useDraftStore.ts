import { create } from 'zustand';
import type { ChatEntry } from '@/types/chat';
import { generateId } from '@/utils/uuid';
import type { LocalAttachment } from '@/utils/attachments';

export interface GrantDraftState {
  draftingMessages: ChatEntry[];
  auditMessages: ChatEntry[];
  exportDocument: string | null;
  attachments: LocalAttachment[];
}
interface DraftStoreState {
  drafts: Record<string, GrantDraftState>;
  ensureDraft: (draftKey: string, grantTitle?: string, funder?: string) => void;
  getDraft: (draftKey: string) => GrantDraftState;
  addDraftingMessage: (draftKey: string, text: string, variant: ChatEntry['variant']) => void;
  addAuditMessage: (draftKey: string, text: string, variant: ChatEntry['variant']) => void;
  setExportDocument: (draftKey: string, doc: string) => void;
  setAttachments: (draftKey: string, attachments: LocalAttachment[]) => void;
  resetDraftForGrant: (draftKey: string, grantTitle: string, funder: string) => void;
}
const empty = (): GrantDraftState => ({
  draftingMessages: [],
  auditMessages: [],
  exportDocument: null,
  attachments: [],
});
export const EMPTY_DRAFT: GrantDraftState = Object.freeze(empty());
export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {},
  ensureDraft: (draftKey) => {
    if (!draftKey || get().drafts[draftKey]) return;
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: empty() } }));
  },
  getDraft: (draftKey) => get().drafts[draftKey] ?? EMPTY_DRAFT,
  addDraftingMessage: (draftKey, text, variant) => {
    if (!draftKey || !text.trim()) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: {
          ...draft,
          draftingMessages: [...draft.draftingMessages, { id: generateId('msg'), text, variant }],
        },
      },
    }));
  },
  addAuditMessage: (draftKey, text, variant) => {
    if (!draftKey || !text.trim()) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: {
          ...draft,
          auditMessages: [...draft.auditMessages, { id: generateId('msg'), text, variant }],
        },
      },
    }));
  },
  setExportDocument: (draftKey, exportDocument) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: { ...draft, exportDocument } } }));
  },
  setAttachments: (draftKey, attachments) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: { ...draft, attachments } } }));
  },
  resetDraftForGrant: (draftKey) => {
    if (!draftKey) return;
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: empty() } }));
  },
}));
