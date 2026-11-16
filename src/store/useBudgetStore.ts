import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  addBudgetLineItem,
  buildDefaultBudgetRecord,
  isBudgetRecordMap,
  removeBudgetLineItem,
  updateBudgetCaps,
  updateBudgetLineItem,
  type BudgetLineItem,
  type WorkSlotBudgetRecord,
} from '@/utils/budget';

const persistence = createDevicePersistence(
  'grantum.budget.v1',
  getDeviceStorage(),
  isBudgetRecordMap
);

interface BudgetState {
  records: Record<string, WorkSlotBudgetRecord>;
  hasSaved: boolean;
  hydrated: boolean;
  status: PersistenceStatus;
  addLineItem: (
    slotKey: string,
    input: { description: string; quantity: string; unitRate: string }
  ) => void;
  updateLineItem: (
    slotKey: string,
    itemId: string,
    patch: Partial<Pick<BudgetLineItem, 'description' | 'quantity' | 'unitRate'>>
  ) => void;
  removeLineItem: (slotKey: string, itemId: string) => void;
  saveCaps: (
    slotKey: string,
    input: { fundingCap: string; overheadPctCap: string; overheadAmount: string }
  ) => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  records: persistence.initial ?? {},
  hasSaved: Boolean(persistence.initial),
  hydrated: persistence.hydrated,
  status: persistence.status,
  addLineItem: (slotKey, input) => {
    const base = get().records[slotKey] ?? buildDefaultBudgetRecord(slotKey);
    const updated = addBudgetLineItem(base, input);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
  updateLineItem: (slotKey, itemId, patch) => {
    const base = get().records[slotKey] ?? buildDefaultBudgetRecord(slotKey);
    const updated = updateBudgetLineItem(base, itemId, patch);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
  removeLineItem: (slotKey, itemId) => {
    const base = get().records[slotKey] ?? buildDefaultBudgetRecord(slotKey);
    const updated = removeBudgetLineItem(base, itemId);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
  saveCaps: (slotKey, input) => {
    const base = get().records[slotKey] ?? buildDefaultBudgetRecord(slotKey);
    const updated = updateBudgetCaps(base, input);
    const records = { ...get().records, [slotKey]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, hasSaved: true, status });
  },
}));

export async function hydrateBudget() {
  await persistence.hydrate((records) =>
    useBudgetStore.setState({ records, hasSaved: Object.keys(records).length > 0 })
  );
  useBudgetStore.setState({ hydrated: true, status: persistence.status });
}
