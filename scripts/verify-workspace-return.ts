import { workspaceReturnPath } from '../src/utils/workspaceReturn';

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

for (const value of [
  '/grants/2/drafting',
  '/grants/grant%2Fwith%20spaces/drafting',
  '/settings',
  '/discover',
  '/my-works',
  '/project-profile',
]) {
  equal(workspaceReturnPath(value), value);
}
for (const value of [
  undefined,
  '',
  '//example.org',
  'https://example.org',
  '/plans',
  '/roadmap',
  '/onboarding',
  '/admin',
  '/grants/../drafting',
  '/grants/%2e%2e/drafting',
  '/grants/%252e%252e%252fadmin/drafting',
  '/grants/./dashboard',
  '/grants/2/drafting?redirect=https://example.org',
]) {
  equal(workspaceReturnPath(value), '/dashboard');
}
equal(workspaceReturnPath(['/grants/2/audit-studio']), '/grants/2/audit-studio');
console.log(
  'PASS Given a plans return target, when validated, then grant identity is preserved and unsafe or privileged paths fall back'
);
