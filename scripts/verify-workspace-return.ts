import { workspaceReturnPath } from '../src/utils/workspaceReturn';

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

for (const value of ['/grants/2/drafting', '/settings', '/discover', '/my-works']) {
  equal(workspaceReturnPath(value), value);
}
for (const value of [
  undefined,
  '',
  '//example.org',
  'https://example.org',
  '/plans',
  '/roadmap',
  '/grants/2/drafting?redirect=https://example.org',
]) {
  equal(workspaceReturnPath(value), '/dashboard');
}
equal(workspaceReturnPath(['/grants/2/audit-studio']), '/grants/2/audit-studio');
console.log(
  'PASS Given a plans return target, when validated, then grant identity is preserved and unsafe paths fall back'
);
