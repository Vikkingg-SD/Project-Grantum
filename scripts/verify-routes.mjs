import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { auditInterfaces } from './interface-audit.mjs';

const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const runtimePolicy = require('./scripts/runtime-policy.cjs');
const runtime = runtimePolicy.loadPolicy();
const leaves = [
  'dashboard',
  'discovery-studio',
  'drafting',
  'audit-studio',
  'export-humanizer',
  'post-award-tracker',
];
let passed = 0;
const check = async (name, action) => {
  await action();
  passed++;
  process.stdout.write(`PASS ${name}\n`);
};
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

await check('route tree uses six pure screen re-exports and no legacy tabs', () => {
  assert.equal(fs.existsSync(path.join(root, 'app/(tabs)')), false);
  for (const leaf of leaves) {
    assert.match(
      read(`app/grants/[grantID]/${leaf}.tsx`),
      /^export \{ default \} from '@\/screens\/\w+Screen';\s*$/
    );
  }
  assert.match(read('app/index.tsx'), /tourCompleted \? '\/dashboard' : '\/onboarding'/);
  assert.match(read('app/grants/[grantID]/index.tsx'), /Redirect/);
  assert.match(read('app/dashboard.tsx'), /useGrants/);
  assert.match(read('src/screens/NotFoundScreen.tsx'), /router.replace\('\/dashboard'\)/);
});
await check('grant identity and history have a single route owner', () => {
  assert.doesNotMatch(read('src/config/constants.ts'), /HISTORY_CAP/);
  for (const name of ['Drafting', 'Audit', 'Export', 'PostAward']) {
    assert.match(read(`src/screens/${name}Screen.tsx`), /useActiveGrantId\(\)/);
  }
  assert.match(read('src/hooks/useActiveGrantId.ts'), /useLocalSearchParams/);
});

await check('workspace workflows have independent page routes', () => {
  for (const [leaf, screen] of [
    ['my-works', 'MyWorks'],
    ['project-profile', 'ProjectProfile'],
    ['discover', 'Discovery'],
    ['settings', 'PersonalSettings'],
    ['admin', 'Admin'],
  ]) {
    assert.equal(
      read(`app/(workspace)/${leaf}.tsx`).trim(),
      `export { default } from '@/screens/${screen}Screen';`
    );
  }
  assert.doesNotMatch(
    read('src/components/organisms/WorkspaceStudioBar.tsx'),
    /ProjectProfileModal|MyWorksModal|AccountAdminModal/
  );
});

// Like the existing preflight verifier, lint this mjs with the installed Expo
// parser and every project rule. The ordinary lint command covers js/ts/tsx.
const { ESLint } = await import('eslint');
const expoConfig = require.resolve('eslint-config-expo');
const expoRequire = createRequire(expoConfig);
const linter = new ESLint({
  resolvePluginsRelativeTo: path.dirname(expoConfig),
  overrideConfig: { parser: expoRequire.resolve('@typescript-eslint/parser') },
});
const lintResults = await linter.lintFiles([fileURLToPath(import.meta.url)]);
if (lintResults.some((result) => result.errorCount || result.warningCount)) {
  const formatter = await linter.loadFormatter('stylish');
  process.stderr.write(formatter.format(lintResults));
  throw new Error('Route verifier strict lint failed');
}

if (process.argv.includes('--static')) {
  process.stdout.write(`verify:routes ${passed} structural cases passed; browser NOT RUN\n`);
  process.exit(0);
}

// Exercise the development app. Production builds remain a separate release check.
const reservation = createServer();
await new Promise((resolve, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, 'localhost', resolve);
});
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://localhost:${port}`;
const child = spawn(
  process.execPath,
  [
    require.resolve('expo/bin/cli'),
    'start',
    '--web',
    '--offline',
    '--max-workers',
    String(runtime.workers),
    '--port',
    String(port),
  ],
  {
    cwd: root,
    // Fixture mode is scoped to this child; the app reads it through config/env.ts.
    env: { ...runtimePolicy.childEnvironment(runtime), EXPO_PUBLIC_DATA_SOURCE: 'mock' },
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);
let startupLog = '';
let startupError;
let childExited = false;
child.once('exit', () => {
  childExited = true;
});
child.once('error', (error) => {
  startupError = error;
});
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (chunk) => {
    startupLog += String(chunk);
  });
const stop = () => {
  if (!child.pid || childExited || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else process.kill(-child.pid, 'SIGTERM');
};
process.once('exit', stop);
let browser;
const diagnostics = [];
try {
  const started = Date.now();
  let ready = false;
  while (Date.now() - started < runtime.readyMs) {
    if (startupError) throw startupError;
    if (childExited || child.exitCode !== null)
      throw new Error(`Owned Expo exited ${child.exitCode}: ${startupLog.slice(-1600)}`);
    try {
      if ((await fetch(origin, { signal: globalThis.AbortSignal.timeout(runtime.fetchMs) })).ok) {
        ready = true;
        break;
      }
    } catch {
      /* server is starting */
    }
    await delay(500);
  }
  if (!ready) throw new Error(`Development Metro readiness timeout: ${startupLog.slice(-1600)}`);
  browser = await chromium.launch({ headless: true, timeout: runtime.navigationMs });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(runtime.expectMs);
  page.setDefaultNavigationTimeout(runtime.navigationMs);
  page.on('pageerror', (error) => diagnostics.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(message.text());
  });
  const visible = (text) =>
    page
      .getByText(text, { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: runtime.testMs });
  const dismissSupportIfOpen = async () => {
    const dialog = page.getByRole('dialog', { name: 'Support Grantum', exact: true });
    await dialog.waitFor({ state: 'visible', timeout: 800 }).catch(() => {});
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Remind me in 3 days', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
  };
  const url = (grant, leaf) => `${origin}/grants/${encodeURIComponent(grant)}/${leaf}`;

  await check('cold grant-2 drafting resolves without a prior selection', async () => {
    await page.goto(url('2', 'drafting'));
    await visible('Community Health Access');
    assert.equal(new URL(page.url()).pathname, '/grants/2/drafting');
  });
  await check('reload preserves the URL grant', async () => {
    await page.reload();
    await visible('Community Health Access');
    assert.equal(new URL(page.url()).pathname, '/grants/2/drafting');
  });
  for (const [index, leaf] of leaves.entries()) {
    await check(`grant-2 navigation selects ${leaf} and preserves identity`, async () => {
      await page.getByRole('tab').nth(index).click();
      await page.waitForURL(url('2', leaf));
      if (leaf === 'dashboard') await dismissSupportIfOpen();
      await expect(page.getByRole('tab').nth(index)).toHaveAttribute('aria-selected', 'true');
      if (leaf === 'drafting') await visible('Community Health Access');
    });
  }
  await check('view history responds to browser Back and Forward', async () => {
    await page.getByRole('tab').nth(2).click();
    await page.waitForURL(url('2', 'drafting'));
    await page.getByRole('tab').nth(3).click();
    await page.waitForURL(url('2', 'audit-studio'));
    await page.goBack();
    await page.waitForURL(url('2', 'drafting'));
    await page.goForward();
    await page.waitForURL(url('2', 'audit-studio'));
  });
  await check('cross-shell Back and Escape restore the exact visible grant view', async () => {
    await page.goto(url('2', 'drafting'));
    const back = page.getByRole('button', { name: 'Go back', exact: true });
    await page.getByRole('tab', { name: 'Audit', exact: true }).click();
    await page.getByRole('button', { name: 'My Works', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/my-works`);
    const search = page.getByRole('textbox', { name: /search/i }).first();
    await search.focus();
    await page.keyboard.press('Escape');
    await expect(search).not.toBeFocused();
    await expect(page).toHaveURL(`${origin}/my-works`);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(url('2', 'audit-studio'));
    await expect(page.getByRole('tab', { name: 'Audit', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await page.goForward();
    await expect(page).toHaveURL(`${origin}/my-works`);
    await back.click();
    await expect(page).toHaveURL(url('2', 'audit-studio'));
  });
  await check(
    'brand resumes grant 2, no duplicate Discover tab, and Back never leaks admin',
    async () => {
      await page.goto(url('2', 'drafting'));
      await visible('Community Health Access');
      await expect(page.getByRole('button', { name: 'Discover', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'My Works', exact: true }).click();
      await page.getByRole('button', { name: 'Project Profile', exact: true }).click();
      await page.getByRole('button', { name: 'Resume last grant view', exact: true }).click();
      await expect(page).toHaveURL(url('2', 'drafting'));
      await visible('Community Health Access');
      await page.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(page).toHaveURL(`${origin}/project-profile`);
      await expect(page.getByText('Staff administration', { exact: true })).toBeHidden();
      // Visit /admin explicitly, then move to /my-works -> Go back must skip /admin completely.
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Account menu', exact: true })
        .getByRole('button', { name: 'Staff administration', exact: true })
        .click();
      await expect(page).toHaveURL(`${origin}/admin`);
      await page.getByRole('button', { name: 'My Works', exact: true }).click();
      await expect(page).toHaveURL(`${origin}/my-works`);
      await page.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(page).toHaveURL(`${origin}/project-profile`);
      await expect(page.getByText('Staff administration', { exact: true })).toBeHidden();
    }
  );
  await check(
    'cold workspace Back is disabled, Plans omits public roadmap, and /roadmap redirects',
    async () => {
      await page.goto(`${origin}/my-works`);
      const back = page.getByRole('button', { name: 'Go back', exact: true });
      await expect(back).toBeDisabled();
      await page.goto(url('2', 'drafting'));
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      const menu = page.getByRole('dialog', { name: 'Account menu' });
      await expect(menu).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(page).toHaveURL(url('2', 'drafting'));
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await menu.getByRole('button', { name: 'Subscriptions & plans', exact: true }).click();
      await expect(page).toHaveURL(/\/plans\?/);
      await expect(
        page.getByRole('button', { name: 'Open public roadmap', exact: true })
      ).toHaveCount(0);
      await expect(back).toBeEnabled();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(url('2', 'drafting'));
      await visible('Community Health Access');
      // Settings -> Plans preserves returnTo=/settings
      await page.goto(`${origin}/settings`);
      await page
        .getByRole('button', { name: 'Subscriptions & plans overview', exact: true })
        .click();
      await expect(page).toHaveURL(/\/plans\?returnTo=%2Fsettings/);
      await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
      await expect(page).toHaveURL(`${origin}/settings`);
      // Cold /plans Back is disabled and /roadmap redirects to Dashboard roadmap
      await page.goto(`${origin}/plans`);
      await expect(back).toBeDisabled();
      await expect(
        page.getByRole('button', { name: 'Open public roadmap', exact: true })
      ).toHaveCount(0);
      await page.getByRole('button', { name: 'Back to workspace', exact: true }).click();
      await expect(page).toHaveURL(url('1', 'dashboard'));
      await dismissSupportIfOpen();
      await page.goto(`${origin}/roadmap`);
      await expect(page).toHaveURL(url('1', 'dashboard'));
      await dismissSupportIfOpen();
      await expect(page.getByTestId('product-roadmap-track')).toBeVisible();
    }
  );
  await check('Escape dismisses non-modal panels before triggering Back navigation', async () => {
    await page.goto(url('2', 'dashboard'));
    await dismissSupportIfOpen();
    await page.getByRole('tab', { name: 'Drafting', exact: true }).click();
    await expect(page).toHaveURL(url('2', 'drafting'));
    const sectionsToggle = page.getByRole('button', { name: /^Required sections/ });
    await sectionsToggle.click();
    await expect(sectionsToggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(sectionsToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(url('2', 'drafting'));
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(url('2', 'dashboard'));
  });
  await check(
    'in-app history is bounded, supports 3-step return, and blocks self-nav spam',
    async () => {
      await page.goto(url('2', 'dashboard'));
      await dismissSupportIfOpen();
      const back = page.getByRole('button', { name: 'Go back', exact: true });
      const dashboard = page.getByRole('tab', { name: 'Dashboard', exact: true });
      const brand = page.getByRole('button', { name: 'Resume last grant view', exact: true });
      await expect(back).toBeDisabled();
      const initialLength = await page.evaluate(() => window.history.length);
      await brand.click();
      await dashboard.click();
      await brand.click();
      assert.equal(await page.evaluate(() => window.history.length), initialLength);
      await expect(back).toBeDisabled();
      // dashboard -> drafting -> audit -> dashboard, then 3x Back -> audit -> drafting -> dashboard
      await page.getByRole('tab', { name: 'Drafting', exact: true }).click();
      await expect(page).toHaveURL(url('2', 'drafting'));
      await page.getByRole('tab', { name: 'Audit', exact: true }).click();
      await expect(page).toHaveURL(url('2', 'audit-studio'));
      await dashboard.click();
      await expect(page).toHaveURL(url('2', 'dashboard'));
      await back.click();
      await expect(page).toHaveURL(url('2', 'audit-studio'));
      await back.click();
      await expect(page).toHaveURL(url('2', 'drafting'));
      await back.click();
      await expect(page).toHaveURL(url('2', 'dashboard'));
      await expect(back).toBeDisabled();
      const destinations = [
        ['Drafting', 'drafting'],
        ['Audit', 'audit-studio'],
      ];
      for (let index = 0; index < 12; index++) {
        const [name, leaf] = destinations[index % 2];
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(page).toHaveURL(url('2', leaf));
      }
      for (let index = 10; index >= 1; index--) {
        await back.click();
        await expect(page).toHaveURL(url('2', destinations[index % 2][1]));
      }
      await expect(back).toBeDisabled();
    }
  );
  await check('explicit Dashboard application selection changes the grant URL', async () => {
    await page.goto(url('2', 'dashboard'));
    await dismissSupportIfOpen();
    await page.getByRole('button', { name: 'Help me apply', exact: true }).first().click();
    await page.waitForURL(/\/grants\/1\/drafting$/);
    await visible('Climate Resilience Infrastructure');
    await page.goBack();
    await page.waitForURL(url('2', 'dashboard'));
    await page.goForward();
    await page.waitForURL(url('1', 'drafting'));
  });
  await check('a grant index redirects to its own dashboard', async () => {
    await page.goto(`${origin}/grants/2`);
    await page.waitForURL(url('2', 'dashboard'));
    await visible('Welcome back, Alex.');
  });
  await check('root opens onboarding, which hands off a queried grant', async () => {
    await page.goto(url('2', 'drafting'));
    await page.goto(origin);
    await page.waitForURL(`${origin}/onboarding`);
    await visible('Explore funding opportunities.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await visible('Give every requirement a place in your draft.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await visible('Check your sections before the final review.');
    await page.getByRole('button', { name: 'Get started', exact: true }).click();
    await page.waitForURL(url('1', 'dashboard'));
    await visible('Welcome back, Alex.');
    await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeDisabled();
    await page.goBack();
    await expect(page).toHaveURL(url('2', 'drafting'));
    await page.goto(origin);
    await expect(page).toHaveURL(url('1', 'dashboard'));
    await expect(page.getByText('Explore funding opportunities.', { exact: true })).toBeHidden();
  });
  await check('dashboard recovery entry selects an actual queried grant', async () => {
    await page.goto(`${origin}/dashboard`);
    await page.waitForURL(url('1', 'dashboard'));
    await visible('Welcome back, Alex.');
  });
  await check('mobile navigation also preserves grant identity', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url('2', 'drafting'));
    await visible('Community Health Access');
    await page.getByRole('button', { name: 'Next navigation tabs' }).click();
    await page.getByRole('tab', { name: 'Export', exact: true }).click();
    await page.waitForURL(url('2', 'export-humanizer'));
    await expect(page.getByRole('tab', { name: 'Export', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
  await check(
    'unknown, traversal, or colliding grant IDs never hang or fall back to another grant',
    async () => {
      await page.goto(url('missing-grant', 'drafting'));
      await visible('Opportunity unavailable');
      await expect(
        page.getByRole('button', { name: 'Back to dashboard', exact: true })
      ).toBeVisible();
      assert.equal(new URL(page.url()).pathname, '/grants/missing-grant/drafting');
      assert.equal(
        (await page.locator('body').innerText()).includes('Community Health Access'),
        false
      );
      assert.equal(
        (await page.locator('body').innerText()).includes('Climate Resilience Infrastructure'),
        false
      );
      // Encoded traversal payload (/grants/%2e%2e%2fadmin/drafting) must fail closed without hanging.
      await page.goto(`${origin}/grants/%2e%2e%2fadmin/drafting`);
      await visible('Opportunity unavailable');
      await expect(
        page.getByRole('button', { name: 'Back to dashboard', exact: true })
      ).toBeVisible();
      // Navigating away from an unavailable grant must not allow Back to return to it.
      await page.getByRole('button', { name: 'My Works', exact: true }).click();
      await expect(page).toHaveURL(`${origin}/my-works`);
      await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeDisabled();
    }
  );
  await check(
    'Given Bounty Hunt form, when bogus URL rejected and confirmed 6-field form submitted, then inputs render without runtime errors',
    async () => {
      await page.goto(`${origin}/discover`);
      await page.getByRole('button', { name: 'Bounty Hunt', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Bounty Hunt', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Submit for Bounty Hunt', exact: true }).click();
      await expect(
        dialog.getByRole('textbox', { name: 'Source title (required)', exact: true })
      ).toHaveAttribute('aria-invalid', 'true');
      await expect(
        dialog.getByRole('textbox', { name: 'Location / region (required)', exact: true })
      ).toHaveAttribute('aria-invalid', 'true');
      await dialog
        .getByRole('textbox', { name: 'Source title (required)', exact: true })
        .fill('Official funding opportunities');
      await dialog
        .getByRole('textbox', { name: 'Official source URL (required)', exact: true })
        .fill('https://bullshit.com');
      await dialog.getByRole('button', { name: 'Verify link', exact: true }).click();
      await expect(dialog.getByText('Link unconfirmed', { exact: true })).toBeVisible();
      await expect(dialog.getByTestId('confirmed-source-link')).toHaveCount(0);
      await dialog
        .getByRole('textbox', { name: 'Official source URL (required)', exact: true })
        .fill('https://foundation.org/funding');
      const confirmedLink = dialog.getByTestId('confirmed-source-link');
      await expect(confirmedLink).toBeVisible();
      await expect(confirmedLink).toHaveAttribute('href', 'https://foundation.org/funding');
      await expect(confirmedLink).toHaveAttribute('target', '_blank');
      await expect(confirmedLink).toHaveAttribute('rel', /noopener/);
      await expect(confirmedLink).toHaveAttribute('rel', /noreferrer/);
      await dialog
        .getByRole('textbox', { name: 'Location / region (required)', exact: true })
        .fill('Global');
      await dialog.getByRole('button', { name: 'Use Not published', exact: true }).click();
      await dialog
        .getByRole('textbox', { name: 'Mission (required)', exact: true })
        .fill('Support climate resilience research');
      await dialog
        .getByRole('textbox', { name: 'What Grantum should also note (required)', exact: true })
        .fill('Requires institutional lead');
      await dialog.getByRole('button', { name: 'Submit for Bounty Hunt', exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText('Official funding opportunities', { exact: true })).toBeVisible();
      await expect(page.getByText('Pending review', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Bounty Hunt', exact: true }).click();
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('textbox', { name: 'Source title (required)', exact: true })
      ).toHaveValue('');
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  );
  await check('development navigation emits no unexpected runtime errors', () => {
    assert.deepEqual(diagnostics, []);
  });
  await context.close();
  if (!process.argv.includes('--navigation-only')) await auditInterfaces(browser, origin, runtime);
} finally {
  if (browser) await browser.close();
  fs.mkdirSync(path.join(root, '.expo/s8'), { recursive: true });
  fs.writeFileSync(path.join(root, '.expo/s8/routes-startup.log'), startupLog);
  stop();
  const cleanupDeadline = Date.now() + runtime.cleanupMs;
  while (!childExited && child.pid && Date.now() < cleanupDeadline) await delay(100);
  process.removeListener('exit', stop);
  if (child.pid && !childExited) throw new Error('Owned Metro process did not exit during cleanup');
}

fs.writeFileSync(
  path.join(root, '.expo/s8/routes-result.json'),
  JSON.stringify(
    {
      passed,
      failures: 0,
      diagnostics,
      mode: 'development',
      dataSource: 'mock-fixture',
      production: 'NOT RUN',
      native: 'NOT RUN',
      ownedProcesses: 'closed',
    },
    null,
    2
  )
);
process.stdout.write(`verify:routes ${passed} passed, 0 failed; development web only\n`);
