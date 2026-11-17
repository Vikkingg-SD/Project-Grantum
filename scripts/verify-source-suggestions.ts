import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  isSourceHistory,
  normalizeSourceUrl,
  validateSource,
  type SourceSuggestion,
} from '../src/utils/sourceSuggestions';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  check(
    'Given equivalent HTTPS host/default-port URLs When normalized Then canonical identity matches',
    normalizeSourceUrl(' HTTPS://EXAMPLE.ORG:443/fund?a=1#section ') ===
      'https://example.org/fund?a=1'
  );
  check(
    'Given distinct query values When normalized Then identities remain distinct',
    normalizeSourceUrl('https://example.org/?round=1') !==
      normalizeSourceUrl('https://example.org/?round=2')
  );
  check(
    'Given valid HTTPS URL with fragment When normalized Then fragment is stripped and query preserved',
    normalizeSourceUrl('  https://example.org/grants?round=2#apply ') ===
      'https://example.org/grants?round=2'
  );
  check(
    'Given non-HTTPS, credentialed, or malformed URLs When normalized Then they are rejected',
    normalizeSourceUrl('http://example.org/grants') === undefined &&
      normalizeSourceUrl('https://user:pass@example.org/grants') === undefined &&
      normalizeSourceUrl('https://localhost/grants') === undefined &&
      normalizeSourceUrl('https://example.org/has space') === undefined &&
      normalizeSourceUrl('javascript:alert(1)') === undefined
  );
  const invalidErrors = validateSource('', 'http://example.org', 'x'.repeat(1001));
  check(
    'Given missing title, HTTP URL, and oversized note When validated Then all three field errors are returned',
    Boolean(invalidErrors.title && invalidErrors.url && invalidErrors.note)
  );
  const validErrors = validateSource(
    'EU Horizon Call',
    'https://ec.europa.eu/funding',
    'Relevant for AI'
  );
  check(
    'Given valid source inputs When validated Then no field errors are returned',
    !validErrors.title && !validErrors.url && !validErrors.note
  );
  const sample: SourceSuggestion[] = [
    {
      id: '2026-11-16T12:00:00.000Z-0',
      title: 'EU Horizon Call',
      url: 'https://ec.europa.eu/funding',
      note: 'Relevant for AI',
      createdAt: '2026-11-16T12:00:00.000Z',
    },
  ];
  check(
    'Given valid and corrupt source histories When checked with type guard Then only valid history passes',
    isSourceHistory(sample) && !isSourceHistory([{ ...sample[0], url: 'http://insecure.org' }])
  );

  const values = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
  const persistence = createDevicePersistence(
    'grantum.source-suggestions.v1',
    storage,
    isSourceHistory
  );
  let restored: SourceSuggestion[] = [];
  await persistence.hydrate((items) => {
    restored = items;
  });
  let status = '';
  persistence.save(sample, (next) => {
    status = next;
  });
  await persistence.flush();
  const reload = createDevicePersistence('grantum.source-suggestions.v1', storage, isSourceHistory);
  await reload.hydrate((items) => {
    restored = items;
  });
  check(
    'Given saved source suggestion When persisted and reloaded Then entry is retained with device-saved status',
    status === 'device-saved' &&
      restored.length === 1 &&
      restored[0].url === 'https://ec.europa.eu/funding'
  );

  const { hydrateSourceSuggestions, useSourceSuggestionStore } =
    await import('../src/store/useSourceSuggestionStore');
  await hydrateSourceSuggestions();
  check(
    'Given a hydrated empty source history When a valid source is added Then it is accepted',
    useSourceSuggestionStore.getState().add('Fund', 'https://example.org#first', 'Reason') ===
      undefined
  );
  const duplicateError = useSourceSuggestionStore
    .getState()
    .add('Again', 'HTTPS://EXAMPLE.ORG:443/#second', '');
  check(
    'Given a saved canonical URL When an equivalent source is added Then duplicate is rejected without adding an entry',
    Boolean(duplicateError?.includes('already')) &&
      useSourceSuggestionStore.getState().entries.length === 1
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
