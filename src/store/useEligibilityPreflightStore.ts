import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  addCustomPreflightQuestion,
  applyAgentPreflightQuestions,
  buildEmptyPreflight,
  buildPreflightForGrantAndProfile,
  extractMaxChatSeq,
  isEligibilityPreflightState,
  MAX_PREFLIGHT_RECORDS,
  preflightScopeKey,
  prunePreflightRecords,
  setPreflightCriterionAnswer,
  setPreflightCriterionStatus,
  type AgentPreflightQuestionInput,
  type GrantPreflightRecord,
  type PreflightCriterionStatus,
  type PreflightPersistedState,
  type PreflightScope,
} from '@/utils/eligibilityPreflight';
import type { Grant } from '@/types/grant';
import type { ProfileRevision, ProjectProfile } from '@/types/workspace';

const persistence = createDevicePersistence<PreflightPersistedState>(
  'grantum.eligibility-preflight.v2',
  getDeviceStorage(),
  isEligibilityPreflightState
);

export function preflightChatSlotKey(projectId: string, grantId: string, attemptId?: string) {
  const legacyKey = (projectId.trim() || 'project-1') + ':' + (grantId.trim() || 'unknown');
  return attemptId ? legacyKey + ':attempt:' + encodeURIComponent(attemptId) : legacyKey;
}

function pruneChatSessions(sessions: Record<string, number>): Record<string, number> {
  const entries = Object.entries(sessions);
  if (entries.length <= MAX_PREFLIGHT_RECORDS) return sessions;
  return Object.fromEntries(entries.slice(-MAX_PREFLIGHT_RECORDS));
}

function hydrateChatSessions(
  records: Record<string, GrantPreflightRecord>,
  storedSessions: Record<string, number>
): Record<string, number> {
  const merged: Record<string, number> = { ...storedSessions };
  for (const record of Object.values(records)) {
    const slot = preflightChatSlotKey(record.projectId, record.grantId, record.attemptId);
    const derived = extractMaxChatSeq(records, record.projectId, record.grantId, record.attemptId);
    merged[slot] = Math.max(merged[slot] ?? 1, derived);
  }
  return pruneChatSessions(merged);
}

interface EligibilityPreflightState {
  records: Record<string, GrantPreflightRecord>;
  chatSessions: Record<string, number>;
  hydrated: boolean;
  status: PersistenceStatus;
  getActiveChatId: (projectId: string, grantId: string, attemptId?: string) => string;
  startNewChatInterview: (projectId: string, grantId: string, attemptId?: string) => string;
  setCriterionStatus: (
    baseRecord: GrantPreflightRecord,
    criterionId: string,
    nextStatus: PreflightCriterionStatus
  ) => void;
  setCriterionAnswer: (
    baseRecord: GrantPreflightRecord,
    criterionId: string,
    answer: string
  ) => void;
  addCustomQuestion: (
    baseRecord: GrantPreflightRecord,
    question: string,
    uncertainty?: string
  ) => void;
  clearToEmptyTemplate: (scope: PreflightScope) => void;
  scanGrantAndProfile: (input: {
    scope: PreflightScope;
    grant: Pick<Grant, 'id' | 'title' | 'region' | 'amount' | 'eligibilityCriteria'>;
    requirements?: readonly string[];
    project?: Pick<ProjectProfile, 'id' | 'name' | 'kind'> | null;
    revision?: Pick<ProfileRevision, 'id' | 'fields'> | null;
  }) => void;
  populateFromAgent: (
    scope: PreflightScope,
    questions: readonly AgentPreflightQuestionInput[]
  ) => void;
}

const initialRecords = persistence.initial?.records ?? {};
const initialChatSessions = hydrateChatSessions(
  initialRecords,
  persistence.initial?.chatSessions ?? {}
);

export const useEligibilityPreflightStore = create<EligibilityPreflightState>((set, get) => {
  const persistNext = (
    records: Record<string, GrantPreflightRecord>,
    chatSessions: Record<string, number>
  ) => {
    const nextRecords = prunePreflightRecords(records);
    const nextSessions = pruneChatSessions(chatSessions);
    if (!get().hydrated) {
      set({ records: nextRecords, chatSessions: nextSessions });
      return;
    }
    const status = persistence.save({ records: nextRecords, chatSessions: nextSessions }, (next) =>
      set({ status: next })
    );
    set({ records: nextRecords, chatSessions: nextSessions, status });
  };

  return {
    records: initialRecords,
    chatSessions: initialChatSessions,
    hydrated: persistence.hydrated,
    status: persistence.status,
    getActiveChatId: (projectId, grantId, attemptId) => {
      const state = get();
      const slot = preflightChatSlotKey(projectId, grantId, attemptId);
      const seq = Math.max(
        state.chatSessions[slot] ?? 1,
        extractMaxChatSeq(state.records, projectId, grantId, attemptId)
      );
      return `chat-${seq}`;
    },
    startNewChatInterview: (projectId, grantId, attemptId) => {
      const state = get();
      const slot = preflightChatSlotKey(projectId, grantId, attemptId);
      const currentMax = Math.max(
        state.chatSessions[slot] ?? 1,
        extractMaxChatSeq(state.records, projectId, grantId, attemptId)
      );
      const nextSeq = currentMax + 1;
      const nextSessions = { ...state.chatSessions, [slot]: nextSeq };
      persistNext(state.records, nextSessions);
      return `chat-${nextSeq}`;
    },
    setCriterionStatus: (baseRecord, criterionId, nextStatus) => {
      const state = get();
      const current = state.records[baseRecord.scopeKey] ?? baseRecord;
      const updated = setPreflightCriterionStatus(current, criterionId, nextStatus);
      persistNext({ ...state.records, [baseRecord.scopeKey]: updated }, state.chatSessions);
    },
    setCriterionAnswer: (baseRecord, criterionId, answer) => {
      const state = get();
      const current = state.records[baseRecord.scopeKey] ?? baseRecord;
      const updated = setPreflightCriterionAnswer(current, criterionId, answer);
      persistNext({ ...state.records, [baseRecord.scopeKey]: updated }, state.chatSessions);
    },
    addCustomQuestion: (baseRecord, question, uncertainty) => {
      const state = get();
      const current = state.records[baseRecord.scopeKey] ?? baseRecord;
      const updated = addCustomPreflightQuestion(current, question, uncertainty);
      persistNext({ ...state.records, [baseRecord.scopeKey]: updated }, state.chatSessions);
    },
    clearToEmptyTemplate: (scope) => {
      const state = get();
      const empty = buildEmptyPreflight(scope, new Date().toISOString());
      persistNext({ ...state.records, [empty.scopeKey]: empty }, state.chatSessions);
    },
    scanGrantAndProfile: (input) => {
      const state = get();
      const key = preflightScopeKey(input.scope);
      const existing = state.records[key] ?? null;
      const generated = buildPreflightForGrantAndProfile({
        ...input,
        existing,
        nowIso: new Date().toISOString(),
      });
      persistNext({ ...state.records, [generated.scopeKey]: generated }, state.chatSessions);
    },
    populateFromAgent: (scope, questions) => {
      const state = get();
      const key = preflightScopeKey(scope);
      const base = state.records[key] ?? buildEmptyPreflight(scope);
      const populated = applyAgentPreflightQuestions(base, questions);
      persistNext({ ...state.records, [populated.scopeKey]: populated }, state.chatSessions);
    },
  };
});

export async function hydrateEligibilityPreflight() {
  await persistence.hydrate((saved) =>
    useEligibilityPreflightStore.setState({
      records: saved.records,
      chatSessions: hydrateChatSessions(saved.records, saved.chatSessions),
    })
  );
  useEligibilityPreflightStore.setState({ hydrated: true, status: persistence.status });
}
