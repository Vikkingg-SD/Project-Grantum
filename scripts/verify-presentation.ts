import { progressLabel, reportUrgency, formatEventDate } from '../src/utils/presentation';
import { getMockDraft } from '../src/mock/db';
import { applySectionMutation } from '../src/utils/scoring';
import { attachmentError, ATTACHMENT_LIMIT } from '../src/utils/attachments';
const assert = {
  ok(condition: unknown, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
  },
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected)
      throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  match(actual: string, expected: RegExp) {
    if (!expected.test(actual)) throw new Error(`Expected ${actual} to match ${expected}`);
  },
};
const now = Date.parse('2026-11-09T12:00:00Z');
assert.equal(attachmentError({ name: 'budget.csv', size: 100 }), null);
assert.ok(attachmentError({ name: 'run.exe', size: 100 }));
assert.ok(attachmentError({ name: 'empty.pdf', size: 0 }));
assert.ok(attachmentError({ name: 'large.pdf', size: ATTACHMENT_LIMIT + 1 }));
console.info(
  'PASS Given local file references When validated Then unsupported, empty, and oversized files are rejected'
);
assert.match(reportUrgency('2026-11-08T12:00:00Z', now).label, /confirm submission/);
assert.equal(reportUrgency('2026-11-10T12:00:00Z', now).variant, 'failure');
assert.equal(reportUrgency('2026-11-30T12:00:00Z', now).variant, 'pending');
assert.equal(reportUrgency('invalid', now).variant, 'neutral');
console.info(
  'PASS Given a reporting date When classified against a fixed clock Then urgency never implies unrecorded completion'
);
const initial = getMockDraft('1');
const missing = applySectionMutation(initial, {
  action: 'remove',
  sectionName: initial.requiredSections[0],
});
assert.ok(missing.completionPct < initial.completionPct);
assert.equal(missing.completionPct, missing.confidenceScore);
assert.equal(applySectionMutation(missing, { action: 'restore' }).completionPct, 100);
assert.equal(progressLabel(0), 'Ready to begin');
assert.equal(progressLabel(49), 'Building your application');
assert.equal(progressLabel(50), 'Making progress');
assert.equal(progressLabel(75), 'A few sections left');
assert.equal(progressLabel(100), 'Checklist complete');
console.info(
  'PASS Given a section mutation When progress changes Then dashboard progress and its label describe the checklist'
);
assert.ok(!formatEventDate('2026-05-18T14:30:00Z').includes('T14:'));
assert.equal(formatEventDate('Date unavailable'), 'Date unavailable');
console.info(
  'PASS Given machine and missing dates When formatted Then human-readable dates preserve unknown values'
);
