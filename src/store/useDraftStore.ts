import { create } from 'zustand';
import type { ChatEntry } from '@/types/chat';
import { generateId } from '@/utils/uuid';
import type { LocalAttachment } from '@/utils/attachments';

export interface GrantDraftState {
  draftingMessages: ChatEntry[];
  auditMessages: ChatEntry[];
  exportDocument: string | null;
  attachments: LocalAttachment[];
  contentRevision: number;
  auditedSignature: string | null;
}

export interface ChatMessageMeta {
  attachments?: LocalAttachment[];
  toolLabel?: string;
}

interface DraftStoreState {
  drafts: Record<string, GrantDraftState>;
  lastGrantId: string | null;
  setLastGrantId: (grantId: string) => void;
  ensureDraft: (draftKey: string, grantTitle?: string, funder?: string) => void;
  getDraft: (draftKey: string) => GrantDraftState;
  addDraftingMessage: (
    draftKey: string,
    text: string,
    variant: ChatEntry['variant'],
    meta?: ChatMessageMeta
  ) => void;
  addAuditMessage: (
    draftKey: string,
    text: string,
    variant: ChatEntry['variant'],
    meta?: ChatMessageMeta
  ) => void;
  setExportDocument: (draftKey: string, doc: string) => void;
  setAttachments: (draftKey: string, attachments: LocalAttachment[]) => void;
  markContentChanged: (draftKey: string) => void;
  recordAuditSnapshot: (draftKey: string, signature: string) => void;
  resetDraftForGrant: (draftKey: string, grantTitle: string, funder: string) => void;
}
const empty = (): GrantDraftState => ({
  draftingMessages: [],
  auditMessages: [],
  exportDocument: null,
  attachments: [],
  contentRevision: 0,
  auditedSignature: null,
});
export const EMPTY_DRAFT: GrantDraftState = Object.freeze(empty());

function buildChatEntry(
  text: string,
  variant: ChatEntry['variant'],
  meta?: ChatMessageMeta
): ChatEntry {
  const cleanText = text.trim();
  const cleanAttachments = meta?.attachments?.length ? [...meta.attachments] : undefined;
  const cleanTool = meta?.toolLabel?.trim() || undefined;
  return {
    id: generateId('msg'),
    text: cleanText,
    variant,
    attachments: cleanAttachments,
    toolLabel: cleanTool,
  };
}

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {},
  lastGrantId: null,
  setLastGrantId: (grantId) => {
    const clean = grantId.trim();
    if (!clean || get().lastGrantId === clean) return;
    set({ lastGrantId: clean });
  },
  ensureDraft: (draftKey) => {
    if (!draftKey || get().drafts[draftKey]) return;
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: empty() } }));
  },
  getDraft: (draftKey) => get().drafts[draftKey] ?? EMPTY_DRAFT,
  addDraftingMessage: (draftKey, text, variant, meta) => {
    if (!draftKey || (!text.trim() && !(meta?.attachments?.length ?? 0))) return;
    const draft = get().getDraft(draftKey);
    const entry = buildChatEntry(text, variant, meta);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: {
          ...draft,
          draftingMessages: [...draft.draftingMessages, entry],
        },
      },
    }));
  },
  addAuditMessage: (draftKey, text, variant, meta) => {
    if (!draftKey || (!text.trim() && !(meta?.attachments?.length ?? 0))) return;
    const draft = get().getDraft(draftKey);
    const entry = buildChatEntry(text, variant, meta);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: {
          ...draft,
          auditMessages: [...draft.auditMessages, entry],
        },
      },
    }));
  },
  setExportDocument: (draftKey, exportDocument) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    const changed = draft.exportDocument !== exportDocument;
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: {
          ...draft,
          exportDocument,
          contentRevision: changed ? draft.contentRevision + 1 : draft.contentRevision,
        },
      },
    }));
  },
  setAttachments: (draftKey, attachments) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: { ...draft, attachments } } }));
  },
  markContentChanged: (draftKey) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: { ...draft, contentRevision: draft.contentRevision + 1 },
      },
    }));
  },
  recordAuditSnapshot: (draftKey, signature) => {
    if (!draftKey) return;
    const draft = get().getDraft(draftKey);
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: { ...draft, auditedSignature: signature },
      },
    }));
  },
  resetDraftForGrant: (draftKey) => {
    if (!draftKey) return;
    set((state) => ({ drafts: { ...state.drafts, [draftKey]: empty() } }));
  },
}));
