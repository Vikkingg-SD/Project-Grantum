import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { useWorkspaceStore } from './useWorkspaceStore';
import { canRolePerform } from '@/utils/workspace';
import { generateId } from '@/utils/uuid';
import {
  appendSlotActivity,
  createEmptyProgressRecord,
  isProgressRecordMap,
  markWorkplanTaskDone,
  recordSlotExportFormat,
  reopenWorkplanTask,
  verifyWorkplanTask,
  type SlotActivityEvent,
  type WorkSlotProgressRecord,
} from '@/utils/progressTracking';
import type { CoWorkRole } from '@/types/workspace';

const PROGRESS_STORAGE_KEY = 'grantum.progress.v1';
const MAX_PROGRESS_SLOTS = 200;

const persistence = createDevicePersistence(
  PROGRESS_STORAGE_KEY,
  getDeviceStorage(),
  isProgressRecordMap
);

function resolveAuthoritativeRole(slotKey: string, fallbackRole: CoWorkRole): CoWorkRole {
  const wsState = useWorkspaceStore.getState();
  if (slotKey.startsWith('attempt:')) {
    const projectId = wsState.workspace.applications.find(
      (application) => application.id === slotKey.slice('attempt:'.length)
    )?.projectId;
    return projectId ? (wsState.projectRoles[projectId] ?? 'owner') : 'viewer';
  }
  if (!slotKey.startsWith('slot:')) return fallbackRole;
  const projectId = slotKey.slice(5).split(':')[0];
  if (!projectId) return fallbackRole;
  return wsState.projectRoles[projectId] ?? wsState.activeRole ?? fallbackRole;
}

function capProgressRecords(
  records: Record<string, WorkSlotProgressRecord>,
  protectedKey: string
): Record<string, WorkSlotProgressRecord> {
  const keys = Object.keys(records);
  if (keys.length <= MAX_PROGRESS_SLOTS) return records;
  const oldestEvictable = keys
    .filter((k) => k !== protectedKey)
    .sort((a, b) => (records[a].updatedAt || '').localeCompare(records[b].updatedAt || ''))
    .slice(0, keys.length - MAX_PROGRESS_SLOTS);
  const next = { ...records };
  for (const key of oldestEvictable) delete next[key];
  return next;
}

interface ProgressState {
  records: Record<string, WorkSlotProgressRecord>;
  hasSaved: boolean;
  hydrated: boolean;
  status: PersistenceStatus;
  recordActivity: (
    slotKey: string,
    input: {
      actor: string;
      message: string;
      agent?: SlotActivityEvent['agent'];
      status?: SlotActivityEvent['status'];
    }
  ) => void;
  recordExportDownload: (
    slotKey: string,
    format: 'txt' | 'md',
    filename: string,
    actor: string
  ) => void;
  verifyTask: (
    slotKey: string,
    input: {
      taskId: string;
      taskTitle: string;
      autoCompletionPct: number;
      actor: string;
      role: CoWorkRole;
    }
  ) => void;
  markTaskDone: (
    slotKey: string,
    input: {
      taskId: string;
      taskTitle: string;
      autoCompletionPct: number;
      actor: string;
      role: CoWorkRole;
    }
  ) => void;
  reopenTask: (
    slotKey: string,
    input: {
      taskId: string;
      taskTitle: string;
      actor: string;
      role: CoWorkRole;
    }
  ) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => {
  const commitRecord = (
    slotKey: string,
    updater: (current: WorkSlotProgressRecord) => WorkSlotProgressRecord
  ) => {
    const cleanSlotKey = slotKey.trim();
    if (!cleanSlotKey) return;
    const base = get().records[cleanSlotKey] ?? createEmptyProgressRecord(cleanSlotKey);
    const updated = updater(base);
    if (updated === base) return;
    const records = capProgressRecords({ ...get().records, [cleanSlotKey]: updated }, cleanSlotKey);
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  };

  return {
    records: persistence.initial ?? {},
    hasSaved: Boolean(persistence.initial),
    hydrated: persistence.hydrated,
    status: persistence.status,
    recordActivity: (slotKey, input) =>
      commitRecord(slotKey, (current) =>
        appendSlotActivity(current, {
          id: generateId('act'),
          actor: input.actor,
          message: input.message,
          agent: input.agent,
          status: input.status,
        })
      ),
    recordExportDownload: (slotKey, format, filename, actor) =>
      commitRecord(slotKey, (current) => {
        const authoritativeRole = resolveAuthoritativeRole(current.slotKey, 'viewer');
        if (!canRolePerform(authoritativeRole, 'edit')) {
          throw new Error('Your project role cannot record export activity on this slot.');
        }
        return recordSlotExportFormat(current, {
          id: generateId('exp'),
          format,
          filename,
          actor,
        });
      }),
    verifyTask: (slotKey, input) =>
      commitRecord(slotKey, (current) =>
        verifyWorkplanTask(current, {
          ...input,
          role: resolveAuthoritativeRole(current.slotKey, input.role),
          id: generateId('todo'),
        })
      ),
    markTaskDone: (slotKey, input) =>
      commitRecord(slotKey, (current) =>
        markWorkplanTaskDone(current, {
          ...input,
          role: resolveAuthoritativeRole(current.slotKey, input.role),
          id: generateId('todo'),
        })
      ),
    reopenTask: (slotKey, input) =>
      commitRecord(slotKey, (current) =>
        reopenWorkplanTask(current, {
          ...input,
          role: resolveAuthoritativeRole(current.slotKey, input.role),
          id: generateId('todo'),
        })
      ),
  };
});

export async function hydrateProgress() {
  await persistence.hydrate((records) =>
    useProgressStore.setState({ records, hasSaved: Object.keys(records).length > 0 })
  );
  useProgressStore.setState({ hydrated: true, status: persistence.status });
}
