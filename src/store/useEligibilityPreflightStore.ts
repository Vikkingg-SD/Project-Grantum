import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  buildDefaultPreflight,
  isEligibilityPreflightMap,
  setPreflightCriterionStatus,
  type GrantPreflightRecord,
  type PreflightCriterionStatus,
} from '@/utils/eligibilityPreflight';
import type { Grant } from '@/types/grant';

const persistence = createDevicePersistence(
  'grantum.eligibility-preflight.v1',
  getDeviceStorage(),
  isEligibilityPreflightMap
);

interface EligibilityPreflightState {
  records: Record<string, GrantPreflightRecord>;
  hydrated: boolean;
  status: PersistenceStatus;
  setCriterionStatus: (
    grant: Grant,
    criterionId: string,
    nextStatus: PreflightCriterionStatus
  ) => void;
  resetGrantPreflight: (grant: Grant) => void;
}

export const useEligibilityPreflightStore = create<EligibilityPreflightState>((set, get) => ({
  records: persistence.initial ?? {},
  hydrated: persistence.hydrated,
  status: persistence.status,
  setCriterionStatus: (grant, criterionId, nextStatus) => {
    const current = get().records[grant.id] ?? buildDefaultPreflight(grant);
    const updated = setPreflightCriterionStatus(current, criterionId, nextStatus);
    const records = { ...get().records, [grant.id]: updated };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, status });
  },
  resetGrantPreflight: (grant) => {
    const records = { ...get().records, [grant.id]: buildDefaultPreflight(grant) };
    const status = persistence.save(records, (next) => set({ status: next }));
    set({ records, status });
  },
}));

export async function hydrateEligibilityPreflight() {
  await persistence.hydrate((records) => useEligibilityPreflightStore.setState({ records }));
  useEligibilityPreflightStore.setState({ hydrated: true, status: persistence.status });
}
