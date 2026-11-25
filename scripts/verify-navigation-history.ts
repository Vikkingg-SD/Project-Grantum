import {
  applyFallbackBack,
  canUseNativeRouterBack,
  findPreviousBackIndex,
  isBackTargetPath,
  isLifecyclePath,
  isLocalHttpOrigin,
  isSafeExternalUrl,
  isValidGrantId,
  isWorkspaceShellPath,
  MAX_HISTORY_ENTRIES,
  normalizePathname,
  PREVIOUS_DESTINATION_LIMIT,
  reconcileNativeHistory,
  recordHistoryVisit,
  resolveHomeDestination,
  type NavHistory,
} from '../src/utils/navigationHistory';
import { ENDPOINTS } from '../src/api/endpoint';

const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(message ?? `Expected ${String(expected)}, received ${String(actual)}`);
    }
  },
  ok(value: unknown, message?: string) {
    if (!value) throw new Error(message ?? 'Expected truthy assertion value');
  },
  throws(action: () => unknown, pattern: RegExp) {
    try {
      action();
    } catch (error) {
      if (error instanceof Error && pattern.test(error.message)) return;
      throw error;
    }
    throw new Error(`Expected operation to throw matching ${String(pattern)}`);
  },
};

function step(name: string, fn: () => void) {
  fn();
  console.info(`PASS ${name}`);
}

step(
  'Given onboarding -> dashboard -> drafting -> audit -> dashboard, when stepping back 3 times, then restores exact trail and disables back at start',
  () => {
    let history: NavHistory = { visits: [], index: -1 };
    // Onboarding replaced by dashboard on same browser entry key
    history = recordHistoryVisit(history, { key: 'k0', href: '/onboarding' }, false);
    history = recordHistoryVisit(history, { key: 'k0', href: '/grants/1/dashboard' }, false);
    assert.equal(findPreviousBackIndex(history, '/grants/1/dashboard'), -1);

    history = recordHistoryVisit(history, { key: 'k1', href: '/grants/1/drafting' }, false);
    history = recordHistoryVisit(history, { key: 'k2', href: '/grants/1/audit-studio' }, false);
    history = recordHistoryVisit(history, { key: 'k3', href: '/grants/1/dashboard' }, false);

    // Back 1: dashboard -> audit
    const b1 = findPreviousBackIndex(history, '/grants/1/dashboard');
    assert.equal(b1, 2);
    assert.equal(history.visits[b1].href, '/grants/1/audit-studio');
    history = { ...history, index: b1 };

    // Back 2: audit -> drafting
    const b2 = findPreviousBackIndex(history, '/grants/1/audit-studio');
    assert.equal(b2, 1);
    assert.equal(history.visits[b2].href, '/grants/1/drafting');
    history = { ...history, index: b2 };

    // Back 3: drafting -> starting dashboard
    const b3 = findPreviousBackIndex(history, '/grants/1/drafting');
    assert.equal(b3, 0);
    assert.equal(history.visits[b3].href, '/grants/1/dashboard');
    history = { ...history, index: b3 };

    // Back 4: banned at starting destination (never reaches onboarding)
    assert.equal(findPreviousBackIndex(history, '/grants/1/dashboard'), -1);
  }
);

step(
  'Given user is on dashboard, when pressing Grantum repeatedly, then resolveHomeDestination returns null (no-op)',
  () => {
    assert.equal(resolveHomeDestination('/grants/1/dashboard', '/grants/1/dashboard'), null);
    assert.equal(resolveHomeDestination('/grants/1/dashboard', null), null);
    assert.equal(resolveHomeDestination('/dashboard', null), null);
    assert.equal(resolveHomeDestination('/grants/2/audit-studio', '/grants/2/audit-studio'), null);
    assert.equal(resolveHomeDestination('/grants/2/audit-studio', null), null);
  }
);

step(
  'Given user moved from grant-2 audit to My Works and Project Profile, when pressing Grantum, then resumes /grants/2/audit-studio without query params',
  () => {
    assert.equal(
      resolveHomeDestination('/project-profile', '/grants/2/audit-studio?tab=check'),
      '/grants/2/audit-studio'
    );
    assert.equal(resolveHomeDestination('/my-works', '/grants/2/drafting'), '/grants/2/drafting');
    assert.equal(resolveHomeDestination('/my-works', null), '/dashboard');
  }
);

step(
  'Given more than 10 distinct hops, when stepping back, then history caps strictly at 10 previous destinations',
  () => {
    let history: NavHistory = { visits: [], index: -1 };
    const sequence = ['/grants/1/drafting', '/grants/1/audit-studio'];
    for (let i = 0; i < 15; i++) {
      history = recordHistoryVisit(history, { key: `k-${i}`, href: sequence[i % 2] }, false);
    }
    assert.equal(history.visits.length, MAX_HISTORY_ENTRIES);
    assert.equal(history.index, PREVIOUS_DESTINATION_LIMIT);

    let steps = 0;
    while (true) {
      const currentPath = normalizePathname(history.visits[history.index].href);
      const prev = findPreviousBackIndex(history, currentPath);
      if (prev === -1) break;
      steps += 1;
      history = { ...history, index: prev };
    }
    assert.equal(steps, PREVIOUS_DESTINATION_LIMIT);
  }
);

step(
  'Given /admin, /onboarding, /roadmap, or invalid grant routes in history, when computing Back target, then those routes are skipped while exiting /admin still works',
  () => {
    let history: NavHistory = { visits: [], index: -1 };
    history = recordHistoryVisit(history, { key: 'k0', href: '/grants/2/drafting' }, false);
    history = recordHistoryVisit(history, { key: 'k1', href: '/admin' }, false);

    // Exiting /admin back to /grants/2/drafting is allowed
    assert.equal(isWorkspaceShellPath('/admin'), true);
    assert.equal(isBackTargetPath('/admin'), false);
    assert.equal(findPreviousBackIndex(history, '/admin'), 0);

    // Leaving /admin to /my-works -> Back MUST skip /admin and return to /grants/2/drafting
    history = recordHistoryVisit(history, { key: 'k2', href: '/my-works' }, false);
    const prevFromWorks = findPreviousBackIndex(history, '/my-works');
    assert.equal(prevFromWorks, 0);
    assert.equal(history.visits[prevFromWorks].href, '/grants/2/drafting');

    // Invalid grant URLs marked invalid are skipped on Back
    const invalid = new Set(['/grants/missing-grant/drafting', '/grants/dashboard/dashboard']);
    let invalidTrail: NavHistory = { visits: [], index: -1 };
    invalidTrail = recordHistoryVisit(invalidTrail, { key: 'a', href: '/my-works' }, false);
    invalidTrail = recordHistoryVisit(
      invalidTrail,
      { key: 'b', href: '/grants/missing-grant/drafting' },
      false
    );
    invalidTrail = recordHistoryVisit(invalidTrail, { key: 'c', href: '/project-profile' }, false);
    assert.equal(findPreviousBackIndex(invalidTrail, '/project-profile', invalid), 0);

    // Onboarding, roadmap, and legacy redirect aliases are never back targets, whereas /progress-tracking and /form-templates are valid.
    assert.equal(isBackTargetPath('/grants/2/progress-tracking'), true);
    assert.equal(isBackTargetPath('/grants/2/post-award-tracker'), false);
    assert.equal(isBackTargetPath('/form-templates'), true);
    assert.equal(isBackTargetPath('/onboarding'), false);
    assert.equal(isBackTargetPath('/onboarding?replay=1'), false);
    assert.equal(isBackTargetPath('/roadmap'), false);
  }
);

step(
  'Given duplicate canonical paths with different query strings, when finding previous back target, then skips self-duplicates',
  () => {
    let history: NavHistory = { visits: [], index: -1 };
    history = recordHistoryVisit(history, { key: 'k0', href: '/grants/2/drafting' }, false);
    history = recordHistoryVisit(
      history,
      { key: 'k1', href: '/plans?returnTo=%2Fgrants%2F2%2Fdrafting' },
      false
    );
    history = recordHistoryVisit(history, { key: 'k2', href: '/plans?returnTo=%2Fplans' }, false);
    assert.equal(findPreviousBackIndex(history, '/plans'), 0);
  }
);

step(
  'Given traversal or malformed grant IDs, when validated and passed to ENDPOINTS, then rejected while valid encoded IDs work',
  () => {
    for (const bad of [
      '',
      '   ',
      '.',
      '..',
      '%2e',
      '%2e%2e',
      '%2E%2E',
      '../admin',
      '%2e%2e%2fadmin',
      '%252e%252e%252fadmin',
      '%25252e%25252e',
      'grant\\1',
      'grant\u0000id',
      '%ZZ',
      'a'.repeat(129),
    ]) {
      assert.equal(isValidGrantId(bad), false, `Expected invalid grantId: ${bad}`);
      assert.equal(isLifecyclePath(`/grants/${bad}/drafting`), false);
      assert.throws(() => ENDPOINTS.grant(bad), /valid record identifier/i);
    }
    for (const good of ['1', 'grant-2', 'grant/with spaces']) {
      assert.equal(isValidGrantId(good), true, `Expected valid grantId: ${good}`);
      assert.ok(ENDPOINTS.grant(good).startsWith('/api/v1/grants/'));
    }
    assert.equal(isLifecyclePath('/grants/grant%2Fwith%20spaces/drafting'), true);
  }
);

step(
  'Given external URLs, when validated via isSafeExternalUrl, then enforces HTTPS, blocks credentials/schemes, and scopes local HTTP',
  () => {
    assert.equal(isSafeExternalUrl('https://billing.grantum.app/checkout'), true);
    assert.equal(
      isSafeExternalUrl('http://127.0.0.1:4100/downloads/bundle.md', { allowLocalHttp: true }),
      true
    );
    assert.equal(isLocalHttpOrigin('http://127.0.0.1:4100'), true);
    assert.equal(isLocalHttpOrigin('http://localhost:8081'), true);
    assert.equal(isLocalHttpOrigin('https://api.grantum.app'), false);
    for (const unsafe of [
      '',
      '   ',
      'http://billing.grantum.app/checkout',
      'http://127.0.0.1:4100/downloads/bundle.md',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'https://user:pass@billing.grantum.app',
      'https://localhost/checkout',
      'https://billing.grantum.app/has space',
      'https://billing.grantum.app/\u0007',
    ]) {
      assert.equal(isSafeExternalUrl(unsafe), false, `Expected unsafe URL rejected: ${unsafe}`);
    }
  }
);

step(
  'Given native stack replacement after /admin and fallback Back truncation, then /admin cannot be popped and fallback Back never loops',
  () => {
    let nativeHist: NavHistory = { visits: [], index: -1 };
    nativeHist = reconcileNativeHistory(nativeHist, ['k0'], { key: 'k0', href: '/my-works' });
    nativeHist = reconcileNativeHistory(nativeHist, ['k0', 'k1'], { key: 'k1', href: '/admin' });
    nativeHist = reconcileNativeHistory(nativeHist, ['k0', 'k1', 'k2'], {
      key: 'k2',
      href: '/plans',
    });
    // Simulate router.replace('/grants/1/dashboard') replacing k2 with k3 on native stack [k0, k1, k3]
    nativeHist = reconcileNativeHistory(nativeHist, ['k0', 'k1', 'k3'], {
      key: 'k3',
      href: '/grants/1/dashboard',
    });
    assert.equal(
      nativeHist.visits.some((v) => v.key === 'k2'),
      false
    );
    const prevIdx = findPreviousBackIndex(nativeHist, '/grants/1/dashboard');
    assert.equal(prevIdx, 0);
    assert.equal(nativeHist.visits[prevIdx].href, '/my-works');
    // Immediate underlying native route is k1 (/admin), so router.back() MUST NOT be used!
    assert.equal(canUseNativeRouterBack(['k0', 'k1', 'k3'], nativeHist.visits[prevIdx].key), false);
    // If live stack directly underpins k0 -> k3, router.back() is safe
    assert.equal(canUseNativeRouterBack(['k0', 'k3'], nativeHist.visits[prevIdx].key), true);

    // Fallback Back truncation prevents Back infinite loops when key rebinds
    let fallback: NavHistory = {
      visits: [
        { key: 'a', href: '/my-works' },
        { key: 'b', href: '/project-profile' },
        { key: 'c', href: '/settings' },
      ],
      index: 2,
    };
    const b1 = findPreviousBackIndex(fallback, '/settings');
    assert.equal(b1, 1);
    fallback = applyFallbackBack(fallback, b1, 'c', '/project-profile');
    assert.equal(fallback.visits.length, 2);
    assert.equal(fallback.index, 1);

    const b2 = findPreviousBackIndex(fallback, '/project-profile');
    assert.equal(b2, 0);
    fallback = applyFallbackBack(fallback, b2, 'c', '/my-works');
    assert.equal(fallback.visits.length, 1);
    assert.equal(fallback.index, 0);
    assert.equal(findPreviousBackIndex(fallback, '/my-works'), -1);
  }
);

step(
  'Given invalidPaths set on resolveHomeDestination, then cold invalid grant recovers to /dashboard and blacklisted lastLifecycle is ignored',
  () => {
    const invalid = new Set(['/grants/missing-grant/drafting']);
    assert.equal(
      resolveHomeDestination('/grants/missing-grant/drafting', null, invalid),
      '/dashboard'
    );
    assert.equal(
      resolveHomeDestination('/my-works', '/grants/missing-grant/drafting', invalid),
      '/dashboard'
    );
    assert.equal(
      resolveHomeDestination('/grants/missing-grant/drafting', '/grants/2/drafting', invalid),
      '/grants/2/drafting'
    );
  }
);

step(
  'Given two attempts in one view When using Back and Home Then the attempt identifies the destination',
  () => {
    const first = '/grants/1/drafting?attemptId=app-p1-g1';
    const second = '/grants/1/drafting?attemptId=app-p1-g1-2';
    const history = {
      visits: [
        { key: 'a', href: first },
        { key: 'b', href: second },
      ],
      index: 1,
    };
    assert.equal(findPreviousBackIndex(history, second), 0);
    assert.equal(resolveHomeDestination('/my-works', second), second);
    assert.equal(findPreviousBackIndex(history, second, new Set([first])), -1);
    assert.equal(resolveHomeDestination('/my-works', first, new Set([second])), first);
  }
);

step(
  'Given an inactive Android Slot When its leaves unmount Then Back retains the exact attempt destinations',
  () => {
    const original = '/grants/1/drafting?attemptId=app-p1-g1';
    const newer = '/grants/1/drafting?attemptId=app-p1-g1-2';
    const template = '/form-templates?attemptId=app-p1-g1-2';
    const history = {
      visits: [
        { key: 'first', href: original, nativeParentKeys: ['grant-layout'] },
        { key: 'second', href: newer, nativeParentKeys: ['grant-layout'] },
      ],
      index: 1,
    };
    const collapsed = reconcileNativeHistory(history, ['grant-layout', 'templates'], {
      key: 'templates',
      href: template,
    });
    assert.equal(findPreviousBackIndex(collapsed, template), 1);
    assert.equal(collapsed.visits[1].href, newer);
    assert.equal(canUseNativeRouterBack(['grant-layout', 'templates'], 'second'), false);
    const returned = applyFallbackBack(collapsed, 1, null, newer);
    const restored = reconcileNativeHistory(returned, ['grant-layout', 'restored-second'], {
      key: 'restored-second',
      href: newer,
    });
    assert.equal(restored.visits.length, 2);
    assert.equal(restored.visits[findPreviousBackIndex(restored, newer)].href, original);
  }
);
