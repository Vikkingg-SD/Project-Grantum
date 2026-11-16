import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  buildDefaultMilestoneRecord,
  isMilestoneRecordMap,
  setMilestoneItemStatus,
  setWorkSlotMilestoneDates,
  type ApplicationOutcomeStatus,
  type MilestoneStatus,
  type WorkSlotMilestoneRecord,
} from '@/utils/milestones';

const persistence = createDevicePersistence(
  'grantum.milestones.v1',
  getDeviceStorage(),
  isMilestoneRecordMap
);

interface MilestonesState {
  records: Record<string, WorkSlotMilestoneRecord>;
  hasSaved: boolean;
  hydrated: boolean;
  status: PersistenceStatus;
  setMilestoneStatus: (
    slotKey: string,
    milestoneId: string,
    status: MilestoneStatus,
    defaults?: { submittedDate?: string; nextReportDate?: string }
  ) => void;
  saveDatesAndOutcome: (
    slotKey: string,
    input: {
      outcome: ApplicationOutcomeStatus;
      submittedDate: string;
      expectedResultDate: string;
      nextReportDate: string;
    },
    defaults?: { submittedDate?: string; nextReportDate?: string }
  ) => void;
}

export const useMilestonesStore = create<MilestonesState>((set, get) => ({
  records: persistence.initial ?? {},
  hasSaved: Boolean(persistence.initial),
  hydrated: persistence.hydrated,
  status: persistence.status,
  setMilestoneStatus: (slotKey, milestoneId, nextStatus, defaults) => {
    const base =
      get().records[slotKey] ??
      buildDefaultMilestoneRecord(slotKey, defaults?.submittedDate, defaults?.nextReportDate);
    const updated = setMilestoneItemStatus(base, milestoneId, nextStatus);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
  saveDatesAndOutcome: (slotKey, input, defaults) => {
    const base =
      get().records[slotKey] ??
      buildDefaultMilestoneRecord(slotKey, defaults?.submittedDate, defaults?.nextReportDate);
    const updated = setWorkSlotMilestoneDates(base, input);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
}));

export async function hydrateMilestones() {
  await persistence.hydrate((records) =>
    useMilestonesStore.setState({ records, hasSaved: Object.keys(records).length > 0 })
  );
  useMilestonesStore.setState({ hydrated: true, status: persistence.status });
}
