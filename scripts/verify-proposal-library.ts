import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  DEFAULT_REUSABLE_SECTIONS,
  isReusableSectionList,
  requiresOverwriteConfirmation,
  saveReusableSection,
  searchReusableSections,
  type ReusableSectionEntry,
} from '../src/utils/proposalLibrary';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  const hydroMatches = searchReusableSections(DEFAULT_REUSABLE_SECTIONS, 'Hydrophone');
  check(
    'Given starter library When searched for Hydrophone Then matching project-1 entry returns with provenance',
    hydroMatches.length === 1 &&
      hydroMatches[0].projectName === 'CleanWater AI Infrastructure' &&
      hydroMatches[0].grantId === '1'
  );

  check(
    'Given empty vs populated target section When checking overwrite guard Then only non-empty text requires confirmation',
    !requiresOverwriteConfirmation('   ') && requiresOverwriteConfirmation('Drafted content')
  );

  const updated = saveReusableSection(
    DEFAULT_REUSABLE_SECTIONS,
    {
      title: 'Impact & Equity Narrative',
      text: 'Delivered clean telemetry to 1.4M municipal residents.',
      evidence: 'https://cleanwater.example.org/impact',
      projectId: 'project-1',
      projectName: 'CleanWater AI Infrastructure',
      grantId: '1',
      tags: ['Water', 'startup'],
    },
    '2026-11-17T01:00:00.000Z'
  );
  check(
    'Given custom section When saved Then library prepends validated entry and preserves provenance',
    updated.length === 3 &&
      updated[0].title === 'Impact & Equity Narrative' &&
      updated[0].projectId === 'project-1' &&
      updated[0].tags.includes('water')
  );

  check(
    'Given valid and invalid section arrays When checked with type guard Then only valid library passes',
    isReusableSectionList(updated) && !isReusableSectionList([{ ...updated[0], title: '' }])
  );

  const backing = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence(
    'grantum.proposal-library.v1',
    storage,
    isReusableSectionList
  );
  let restored: ReusableSectionEntry[] = [];
  await persistence.hydrate((next) => {
    restored = next;
  });
  let status = '';
  persistence.save(updated, (next) => {
    status = next;
  });
  await persistence.flush();

  const reload = createDevicePersistence(
    'grantum.proposal-library.v1',
    storage,
    isReusableSectionList
  );
  await reload.hydrate((next) => {
    restored = next;
  });
  check(
    'Given saved library When persisted and reloaded Then entries survive reload',
    status === 'device-saved' &&
      restored.length === 3 &&
      restored[0].title === 'Impact & Equity Narrative'
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
