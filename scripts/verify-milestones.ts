import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  buildDefaultMilestoneRecord,
  isMilestoneRecordMap,
  isValidIsoDateInput,
  setMilestoneItemStatus,
  setWorkSlotMilestoneDates,
  summarizeSlotMilestones,
  type WorkSlotMilestoneRecord,
} from '../src/utils/milestones';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  check(
    'Given valid and invalid ISO dates When validated Then only real YYYY-MM-DD dates pass',
    isValidIsoDateInput('2026-12-20') &&
      !isValidIsoDateInput('2026-02-30') &&
      !isValidIsoDateInput('12/20/2026')
  );

  const initial = buildDefaultMilestoneRecord('project-1:grant-1', '2026-11-10', '2026-12-15');
  const toggled = setMilestoneItemStatus(initial, 'ms-2', 'Verified', '2026-11-17T01:00:00.000Z');
  const dated = setWorkSlotMilestoneDates(
    toggled,
    {
      outcome: 'awarded',
      submittedDate: '2026-11-10',
      expectedResultDate: '2026-12-20',
      nextReportDate: '2027-01-05',
    },
    '2026-11-17T01:05:00.000Z'
  );
  const summary = summarizeSlotMilestones(dated);
  check(
    'Given verified milestone and updated dates When summarized Then outcome and counts are exact',
    summary.verifiedCount === 1 &&
      summary.preparedCount === 1 &&
      summary.pendingCount === 1 &&
      summary.summaryLine.includes('Outcome: AWARDED') &&
      summary.summaryLine.includes('Next report: 2027-01-05') &&
      summary.summaryLine.includes('Verified milestones: 1/3')
  );

  let badDateError = '';
  try {
    setWorkSlotMilestoneDates(initial, {
      outcome: 'submitted',
      submittedDate: 'invalid',
      expectedResultDate: '2026-12-05',
      nextReportDate: '2026-12-15',
    });
  } catch (e) {
    badDateError = e instanceof Error ? e.message : String(e);
  }
  check(
    'Given malformed submitted date When saved Then descriptive YYYY-MM-DD validation error throws',
    badDateError === 'Submitted date must use YYYY-MM-DD format.'
  );

  const validMap: Record<string, WorkSlotMilestoneRecord> = {
    'project-1:grant-1': dated,
  };
  check(
    'Given valid and corrupt milestone maps When validated with type guard Then only matching map passes',
    isMilestoneRecordMap(validMap) &&
      !isMilestoneRecordMap({ 'project-1:grant-1': { ...dated, slotKey: 'wrong-key' } })
  );

  const backing = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence(
    'grantum.milestones.v1',
    storage,
    isMilestoneRecordMap
  );
  let restored: Record<string, WorkSlotMilestoneRecord> = {};
  await persistence.hydrate((next) => {
    restored = next;
  });
  let status = '';
  persistence.save(validMap, (next) => {
    status = next;
  });
  await persistence.flush();

  const reload = createDevicePersistence('grantum.milestones.v1', storage, isMilestoneRecordMap);
  await reload.hydrate((next) => {
    restored = next;
  });
  check(
    'Given saved milestone map When persisted and reloaded Then dates and statuses survive reload',
    status === 'device-saved' &&
      restored['project-1:grant-1']?.expectedResultDate === '2026-12-20' &&
      restored['project-1:grant-1']?.milestones[1].status === 'Verified'
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
