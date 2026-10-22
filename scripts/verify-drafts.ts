import { useDraftStore } from '../src/store/useDraftStore';

const getState = () => useDraftStore.getState();

let failed = 0;
const assert = (name: string, condition: boolean) => {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    console.log(`FAIL ${name}`);
    failed += 1;
  }
};

// 1. Unseeded grant returns stable EMPTY_DRAFT reference
const d2a = getState().getDraft('2');
const d2b = getState().getDraft('2');
assert('unseeded getDraft stable reference', d2a === d2b);
assert(
  'unseeded getDraft is EMPTY_DRAFT',
  d2a.completedSections.length === 0 && d2a.draftingMessages.length === 0
);

// 2. ensureDraft is idempotent and creates the draft
getState().ensureDraft('3', 'Test Grant', 'Test Funder');
const d3a = getState().getDraft('3');
getState().ensureDraft('3', 'Test Grant', 'Test Funder');
const d3b = getState().getDraft('3');
assert('ensureDraft creates draft', d3a.requiredSections.length > 0);
assert('ensureDraft is idempotent', d3a === d3b);

// 3. Mutations are keyed by grant (no cross-grant leakage)
getState().ensureDraft('4');
getState().addRequiredSection('4', 'Test Section');
const d4 = getState().getDraft('4');
const d1 = getState().getDraft('1');
assert('mutation applies to target grant', d4.requiredSections.includes('Test Section'));
assert('mutation does not leak to other grants', !d1.requiredSections.includes('Test Section'));

if (failed > 0) {
  console.log(`\n${failed} DRAFT CASES FAILED`);
  process.exit(1);
}
console.log('\nALL DRAFT CASES PASS');
