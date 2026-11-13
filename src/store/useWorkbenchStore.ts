import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { emptyWorkbench, type DraftWorkbench } from '@/utils/drafting';

const WORKBENCH_STORAGE_KEY = 'grantum.workbench.v1';

const persistence = createDevicePersistence<Record<string, DraftWorkbench>>(
  WORKBENCH_STORAGE_KEY,
  getDeviceStorage(),
  (value): value is Record<string, DraftWorkbench> =>
    Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every(
        (work) =>
          work &&
          Array.isArray(work.sections) &&
          Array.isArray(work.versions) &&
          Array.isArray(work.submissions) &&
          Array.isArray(work.outputs)
      )
    )
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
