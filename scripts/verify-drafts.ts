import { useDraftStore, EMPTY_DRAFT } from '../src/store/useDraftStore';
const getState = () => useDraftStore.getState();
let failed = 0;
const assert = (name: string, condition: boolean) => {
  console.log((condition ? 'PASS ' : 'FAIL ') + name);
  if (!condition) failed += 1;
};
const d2a = getState().getDraft('2');
assert('unseeded getDraft stable reference', d2a === getState().getDraft('2'));
assert('unseeded getDraft is EMPTY_DRAFT', d2a === EMPTY_DRAFT);
getState().ensureDraft('3', 'Test Grant', 'Test Funder');
const d3a = getState().getDraft('3');
getState().ensureDraft('3', 'Test Grant', 'Test Funder');
assert('ensureDraft creates client draft', Boolean(getState().drafts['3']));
assert('ensureDraft is idempotent', d3a === getState().getDraft('3'));
getState().setExportDocument('4', 'Unsent document');
getState().addDraftingMessage('4', 'Local note', 'user');
assert(
  'mutation applies to target grant',
  getState().getDraft('4').exportDocument === 'Unsent document'
);
assert(
  'mutation does not leak to other grants',
  getState().getDraft('3') === d3a && getState().getDraft('1') === EMPTY_DRAFT
);
getState().addDraftingMessage('', 'ghost', 'user');
getState().setExportDocument('', 'ghost doc');
assert('empty-id mutation creates no draft', getState().drafts[''] === undefined);
assert('empty-id getDraft is EMPTY_DRAFT', getState().getDraft('') === EMPTY_DRAFT);
assert(
  'server sections and scans are not in client drafts',
  !('requiredSections' in getState().getDraft('4')) &&
    !('completedSections' in getState().getDraft('4')) &&
    !('isScanning' in getState().getDraft('4'))
);
if (failed) process.exit(1);
console.log('ALL 9 DRAFT CASES PASS');
