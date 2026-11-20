import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  isBountyComplete,
  isSourceHistory,
  normalizeSourceUrl,
  validateBountySubmission,
  validateSource,
  verifySourceLink,
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
      normalizeSourceUrl('https://127.0.0.1/grants') === undefined &&
      normalizeSourceUrl('https://example.org/has space') === undefined &&
      normalizeSourceUrl('javascript:alert(1)') === undefined
  );
  check(
    'Given bogus, reserved, or bare generic domains When verified Then they are rejected while direct grant portal URLs and valid redirects confirm',
    verifySourceLink('https://bullshit.com').status === 'unconfirmed-host' &&
      verifySourceLink('https://bullshit.com/grants').status === 'unconfirmed-host' &&
      verifySourceLink('https://whatever.com').status === 'unconfirmed-host' &&
      verifySourceLink('https://grants.nonexistent.invalid/call').status === 'unconfirmed-host' &&
      verifySourceLink('https://randomportal.com').status === 'unconfirmed-host' &&
      verifySourceLink('https://portal.org/out?redirect=https://bullshit.com').status ===
        'unconfirmed-host' &&
      verifySourceLink(
        'https://a.org/1?redirect=https://b.org/2?redirect=https://c.org/3?redirect=javascript:alert(1)'
      ).status === 'unconfirmed-host' &&
      verifySourceLink(
        'https://a.org/1?redirect=https://b.org/2?redirect=https://c.org/3?redirect=https://bullshit.com'
      ).status === 'unconfirmed-host' &&
      verifySourceLink('https://climatefund.com/grants/2026-call').status === 'confirmed' &&
      verifySourceLink('https://portal.org/out?redirect=https://foundation.org/grants/2026#apply')
        .normalizedUrl === 'https://foundation.org/grants/2026'
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

  const incompleteBounty = validateBountySubmission({
    title: 'EU Horizon Call',
    url: 'https://bullshit.com',
    region: '',
    prizePool: '',
    mission: '',
    note: '',
  });
  check(
    'Given incomplete Bounty Hunt fields and bogus URL When validated Then url, region, prizePool, mission, and note fail',
    Boolean(
      !incompleteBounty.title &&
      incompleteBounty.url &&
      incompleteBounty.region &&
      incompleteBounty.prizePool &&
      incompleteBounty.mission &&
      incompleteBounty.note
    )
  );
  const completeBounty = {
    title: 'EU Horizon Call',
    url: 'https://ec.europa.eu/info/funding-tenders',
    region: 'East Europe',
    prizePool: 'Not published',
    mission: 'Support digital public infrastructure.',
    note: 'Open to municipal consortia and NGOs.',
  };
  check(
    'Given all 6 required Bounty Hunt fields including Not published prize pool When checked Then submission is complete',
    isBountyComplete(completeBounty) &&
      !Object.values(validateBountySubmission(completeBounty)).some(Boolean)
  );

  const sample: SourceSuggestion[] = [
    {
      id: '2026-11-16T12:00:00.000Z-0',
      title: 'EU Horizon Call',
      url: 'https://ec.europa.eu/funding',
      region: 'East Europe',
      prizePool: 'Not published',
      mission: 'Support digital public infrastructure.',
      note: 'Relevant for AI',
      moderationStatus: 'pending-review',
      bountyEligible: true,
      rewardGranted: false,
      createdAt: '2026-11-16T12:00:00.000Z',
    },
  ];
  check(
    'Given valid and corrupt source histories When checked with type guard Then only valid history passes',
    isSourceHistory(sample) &&
      !isSourceHistory([{ ...sample[0], url: 'http://insecure.org' }]) &&
      !isSourceHistory([{ ...sample[0], moderationStatus: 'draft', rewardGranted: true }])
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
    'Given a hydrated empty source history When a valid draft is added Then it is accepted',
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

  const draftId = useSourceSuggestionStore.getState().entries[0].id;
  const draftModeration = useSourceSuggestionStore
    .getState()
    .moderate(draftId, 'accepted', 'Attempted early accept');
  check(
    'Given an unsubmitted draft When moderator tries to moderate Then action is blocked without reward',
    Boolean(draftModeration?.includes('awaiting review')) &&
      useSourceSuggestionStore.getState().entries[0].rewardGranted === false
  );

  // Incomplete entry marked changes-requested still blocks Tier 1 reward acceptance
  useSourceSuggestionStore.setState((state) => ({
    entries: state.entries.map((entry) =>
      entry.id === draftId ? { ...entry, moderationStatus: 'changes-requested' as const } : entry
    ),
  }));
  const incompleteModeration = useSourceSuggestionStore
    .getState()
    .moderate(draftId, 'accepted', 'Incomplete accept');
  check(
    'Given an incomplete changes-requested entry When moderator tries to award Tier 1 Then reward is blocked',
    Boolean(incompleteModeration?.includes('complete 6-field')) &&
      useSourceSuggestionStore.getState().entries[0].rewardGranted === false
  );

  // Re-saving a submission-failed entry as draft clears stale failure note
  useSourceSuggestionStore.setState((state) => ({
    entries: state.entries.map((entry) =>
      entry.id === draftId
        ? {
            ...entry,
            moderationStatus: 'submission-failed' as const,
            moderationNote: 'Transient outage',
          }
        : entry
    ),
  }));
  const resaved = useSourceSuggestionStore.getState().saveDraft(
    {
      title: 'Fund',
      url: 'https://example.org',
      region: '',
      prizePool: '',
      mission: '',
      note: 'Updated draft',
    },
    draftId
  );
  check(
    'Given a submission-failed entry When re-saved as draft Then stale failure moderationNote is cleared',
    resaved.entry?.moderationStatus === 'draft' && resaved.entry?.moderationNote === undefined
  );

  const [firstSubmit, secondSubmit] = await Promise.all([
    useSourceSuggestionStore.getState().submitBounty(completeBounty),
    useSourceSuggestionStore.getState().submitBounty(completeBounty),
  ]);
  check(
    'Given concurrent double-tap Bounty Hunt submission When submitted Then exactly one queued entry and receipt are created',
    Boolean(!firstSubmit.error && firstSubmit.entry?.moderationStatus === 'pending-review') &&
      Boolean(firstSubmit.entry?.receiptId?.startsWith('BNT-')) &&
      Boolean(secondSubmit.error?.includes('already in progress')) &&
      useSourceSuggestionStore.getState().entries.length === 2
  );

  const submittedId = firstSubmit.entry!.id;
  check(
    'Given a complete pending submission When accepted once Then Tier 1 reward is granted once and second accept is blocked',
    useSourceSuggestionStore.getState().moderate(submittedId, 'accepted', 'Verified') ===
      undefined &&
      useSourceSuggestionStore.getState().entries.find((e) => e.id === submittedId)
        ?.rewardGranted === true &&
      Boolean(
        useSourceSuggestionStore
          .getState()
          .moderate(submittedId, 'accepted', 'Duplicate award')
          ?.includes('already')
      )
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
