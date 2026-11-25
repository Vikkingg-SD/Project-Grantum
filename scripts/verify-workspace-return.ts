import { workspaceReturnHref, workspaceReturnPath } from '../src/utils/workspaceReturn';

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

for (const value of [
  '/grants/2/drafting',
  '/grants/2/progress-tracking',
  '/grants/2/progress-tracking?attemptId=app-p2-g2',
  '/form-templates?attemptId=app-p2-g2',
  '/grants/grant%2Fwith%20spaces/drafting',
  '/form-templates',
  '/settings',
  '/discover',
  '/my-works',
  '/project-profile',
]) {
  equal(workspaceReturnPath(value), value);
}
equal(workspaceReturnPath('/grants/2/post-award-tracker'), '/grants/2/progress-tracking');
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
  '/grants/2/drafting?attemptId=app-p2-g2&attemptId=app-other',
]) {
  equal(workspaceReturnPath(value), '/dashboard');
}
equal(workspaceReturnPath(['/grants/2/audit-studio']), '/grants/2/audit-studio');
const forwarded = workspaceReturnHref('/affiliate-campaign', '/grants/2/drafting');
equal(
  typeof forwarded === 'object' &&
    forwarded !== null &&
    forwarded.pathname === '/affiliate-campaign' &&
    forwarded.params?.returnTo === '/grants/2/drafting',
  true
);
equal(workspaceReturnHref('/plans', '/admin'), '/plans');
console.info(
  'PASS Given a plans return target, when validated, then grant identity is preserved and unsafe or privileged paths fall back'
);
