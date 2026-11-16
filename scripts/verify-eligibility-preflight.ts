import { mockGrants } from '../src/mock/grants';
import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  buildDefaultPreflight,
  isEligibilityPreflightMap,
  setPreflightCriterionStatus,
  summarizePreflight,
  type GrantPreflightRecord,
} from '../src/utils/eligibilityPreflight';
import { filterGrants } from '../src/utils/filters';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  const scalingOnly = filterGrants(mockGrants, { stages: ['Scaling'] });
  check(
    'Given Scaling stage filter When applied Then only Climate Resilience Infrastructure matches',
    scalingOnly.length === 1 && scalingOnly[0].id === '1'
  );

  const soloSmall = filterGrants(mockGrants, { participations: ['Solo'], teamSizes: ['1-3'] });
  check(
    'Given Solo + 1-3 team size filters When applied Then only Open Data for Public Good matches',
    soloSmall.length === 1 && soloSmall[0].id === '3'
  );

  const mismatched = filterGrants(mockGrants, {
    stages: ['Idea / Early'],
    participations: ['Consortium'],
  });
  check(
    'Given conflicting stage and participation filters When applied Then no grants match',
    mismatched.length === 0
  );

  const initial = buildDefaultPreflight(mockGrants[0]);
  const updated = setPreflightCriterionStatus(
    initial,
    initial.criteria[0].id,
    'met',
    '2026-11-17T00:00:00.000Z'
  );
  const reviewed = setPreflightCriterionStatus(
    updated,
    initial.criteria[1].id,
    'review',
    '2026-11-17T00:01:00.000Z'
  );
  const summary = summarizePreflight(reviewed);
  check(
    'Given default preflight When criteria marked met and review Then summary counts and disclaimer are accurate',
    summary.metCount === 1 &&
      summary.reviewCount === 1 &&
      summary.unconfirmedCount === 1 &&
      summary.totalCount === 3 &&
      summary.summaryText.includes('1/3 criteria confirmed on this device') &&
      summary.summaryText.includes('Does not verify official funder eligibility.')
  );

  const validMap: Record<string, GrantPreflightRecord> = { '1': reviewed };
  const invalidMap = {
    '1': { ...reviewed, grantId: 'mismatch' },
  };
  check(
    'Given valid and invalid preflight maps When validated with type guard Then only matching valid map passes',
    isEligibilityPreflightMap(validMap) && !isEligibilityPreflightMap(invalidMap)
  );

  const backing = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence(
    'grantum.eligibility-preflight.v1',
    storage,
    isEligibilityPreflightMap
  );
  let restored: Record<string, GrantPreflightRecord> = {};
  await persistence.hydrate((next) => {
    restored = next;
  });
  let status = '';
  persistence.save(validMap, (next) => {
    status = next;
  });
  await persistence.flush();

  const reload = createDevicePersistence(
    'grantum.eligibility-preflight.v1',
    storage,
    isEligibilityPreflightMap
  );
  await reload.hydrate((next) => {
    restored = next;
  });
  check(
    'Given saved preflight record When persisted and reloaded Then criteria choices survive reload',
    status === 'device-saved' &&
      restored['1']?.criteria[0].status === 'met' &&
      restored['1']?.criteria[1].status === 'review'
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
