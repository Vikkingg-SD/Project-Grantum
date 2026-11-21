import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { emptyWorkbench, type DraftWorkbench } from '@/utils/drafting';

const WORKBENCH_STORAGE_KEY = 'grantum.workbench.v1';

const isValidDraftSection = (section: unknown): boolean =>
  Boolean(
    section &&
    typeof section === 'object' &&
    typeof (section as { id?: unknown }).id === 'string' &&
    typeof (section as { title?: unknown }).title === 'string' &&
    typeof (section as { text?: unknown }).text === 'string'
  );

const isValidAuditRunRecord = (entry: unknown): boolean => {
  if (!entry || typeof entry !== 'object') return false;
  const rec = entry as Record<string, unknown>;
  return Boolean(
    typeof rec.id === 'string' &&
    typeof rec.turn === 'number' &&
    Number.isFinite(rec.turn) &&
    rec.turn >= 1 &&
    typeof rec.timestamp === 'string' &&
    (rec.status === 'passed' || rec.status === 'failed') &&
    (rec.statusLabel === 'Checklist check passed' || rec.statusLabel === 'Action required') &&
    typeof rec.confidenceScore === 'number' &&
    Number.isFinite(rec.confidenceScore) &&
    rec.confidenceScore >= 0 &&
    rec.confidenceScore <= 100 &&
    Array.isArray(rec.missingSections) &&
    rec.missingSections.every((item: unknown) => typeof item === 'string') &&
    typeof rec.message === 'string' &&
    typeof rec.signature === 'string' &&
    typeof rec.profileRevisionId === 'string' &&
    (rec.sectionVersionId === undefined ||
      rec.sectionVersionId === null ||
      typeof rec.sectionVersionId === 'string')
  );
};

const isValidDraftVersion = (version: unknown): boolean => {
  if (!version || typeof version !== 'object') return false;
  const ver = version as Record<string, unknown>;
  return Boolean(
    typeof ver.id === 'string' &&
    typeof ver.createdAt === 'string' &&
    typeof ver.summary === 'string' &&
    typeof ver.author === 'string' &&
    Array.isArray(ver.sections) &&
    ver.sections.every(isValidDraftSection) &&
    Array.isArray(ver.outputs) &&
    ver.outputs.every((item: unknown) => typeof item === 'string')
  );
};

export const isValidWorkbenchMap = (value: unknown): value is Record<string, DraftWorkbench> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (work) =>
        work &&
        Array.isArray(work.sections) &&
        work.sections.every(isValidDraftSection) &&
        (work.removedCatalogSections === undefined ||
          (Array.isArray(work.removedCatalogSections) &&
            work.removedCatalogSections.every((title: unknown) => typeof title === 'string'))) &&
        (work.auditHistory === undefined ||
          (Array.isArray(work.auditHistory) && work.auditHistory.every(isValidAuditRunRecord))) &&
        (work.auditedSignature === undefined ||
          work.auditedSignature === null ||
          typeof work.auditedSignature === 'string') &&
        Array.isArray(work.versions) &&
        work.versions.every(isValidDraftVersion) &&
        Array.isArray(work.submissions) &&
        Array.isArray(work.outputs)
    )
  );

const persistence = createDevicePersistence<Record<string, DraftWorkbench>>(
  WORKBENCH_STORAGE_KEY,
  getDeviceStorage(),
  isValidWorkbenchMap
);

interface WorkbenchStore {
  work: Record<string, DraftWorkbench>;
  hydrated: boolean;
  persistenceStatus: PersistenceStatus;
  update: (key: string, change: (work: DraftWorkbench) => DraftWorkbench) => void;
}

export const useWorkbenchStore = create<WorkbenchStore>((set) => ({
  work: persistence.initial ?? {},
  hydrated: persistence.hydrated,
  persistenceStatus: persistence.status,
  update: (key, change) =>
    set((state) => {
      const next = {
        ...state.work,
        [key]: change(state.work[key] ?? emptyWorkbench()),
      };
      const persistenceStatus = persistence.save(next, (status) =>
        set({ persistenceStatus: status })
      );
      return { work: next, persistenceStatus };
    }),
}));

export const EMPTY_WORKBENCH = emptyWorkbench();

export async function hydrateWorkbench() {
  await persistence.hydrate((work) => useWorkbenchStore.setState({ work }));
  useWorkbenchStore.setState({ hydrated: true, persistenceStatus: persistence.status });
}
