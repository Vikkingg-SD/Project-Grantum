import { useDraftStore, EMPTY_DRAFT } from '../src/store/useDraftStore';
import './verify-workspace';
import './verify-drafting-history';
const getState = () => useDraftStore.getState();
let failed = 0;
const assert = (name: string, condition: boolean) => {
  console.info((condition ? 'PASS ' : 'FAIL ') + name);
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
getState().setAttachments('4', [{ id: 'file-4', name: 'budget.csv', type: 'text/csv', size: 100 }]);
assert(
  'Given grant-specific references When staged Then files stay isolated from other applications',
  getState().getDraft('4').attachments[0]?.name === 'budget.csv' &&
    getState().getDraft('3').attachments.length === 0
);
getState().setAttachments('4', []);
assert(
  'Given a staged reference When removed Then the application has no remaining reference',
  getState().getDraft('4').attachments.length === 0
);
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
console.info('ALL 11 DRAFT CASES PASS');
