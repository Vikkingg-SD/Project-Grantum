import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
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
  assert.match(read('app/index.tsx'), /Redirect href="\/onboarding"/);
  assert.match(read('app/grants/[grantID]/index.tsx'), /Redirect/);
  assert.match(read('app/dashboard.tsx'), /useGrants/);
  for (const screen of ['NotFound', 'AuthGate'])
    assert.match(read(`src/screens/${screen}Screen.tsx`), /router.replace\('\/dashboard'\)/);
});
await check('grant identity and history have a single route owner', () => {
  assert.doesNotMatch(read('src/store/useUIStore.ts'), /activeGrantId|setActiveGrantId/);
  assert.doesNotMatch(read('src/config/constants.ts'), /HISTORY_CAP/);
  for (const name of ['Drafting', 'Audit', 'Export', 'PostAward']) {
    assert.match(read(`src/screens/${name}Screen.tsx`), /useActiveGrantId\(\)/);
  }
  assert.match(read('src/hooks/useActiveGrantId.ts'), /useLocalSearchParams/);
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
  [require.resolve('expo/bin/cli'), 'start', '--web', '--localhost', '--port', String(port)],
  {
    cwd: root,
    // Keep localhost binding separate from offline networking: Expo treats the
    // --offline and --localhost CLI flags as mutually exclusive host selectors.
    env: { ...process.env, EXPO_OFFLINE: '1', EXPO_PUBLIC_DATA_SOURCE: 'mock' },
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
  while (Date.now() - started < 180000) {
    if (startupError) throw startupError;
    if (childExited || child.exitCode !== null)
      throw new Error(`Owned Expo exited ${child.exitCode}: ${startupLog.slice(-1600)}`);
    try {
      if ((await fetch(origin, { signal: globalThis.AbortSignal.timeout(5000) })).ok) {
        ready = true;
        break;
      }
    } catch {
      /* server is starting */
    }
    await delay(250);
  }
  if (!ready) throw new Error(`Development Metro readiness timeout: ${startupLog.slice(-1600)}`);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => diagnostics.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(message.text());
  });
  const visible = (text) =>
    page
      .getByText(text, { exact: false })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
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
  await check('explicit Dashboard application selection changes the grant URL', async () => {
    await page.goto(url('2', 'dashboard'));
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
    await visible('Good morning, Alex.');
  });
  await check('root opens onboarding, which hands off a queried grant', async () => {
    await page.goto(origin);
    await page.waitForURL(`${origin}/onboarding`);
    await visible('Discover funders that match your project.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await visible('Draft with an assistant that knows compliance rules.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await visible('A deterministic auditor checks your math before you submit.');
    await page.getByRole('button', { name: 'Get started', exact: true }).click();
    await page.waitForURL(url('1', 'dashboard'));
    await visible('Good morning, Alex.');
  });
  await check('dashboard recovery entry selects an actual queried grant', async () => {
    await page.goto(`${origin}/dashboard`);
    await page.waitForURL(url('1', 'dashboard'));
    await visible('Good morning, Alex.');
  });
  await check('mobile navigation also preserves grant identity', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url('2', 'drafting'));
    await visible('Community Health Access');
    await page.getByRole('tab').nth(4).click();
    await page.waitForURL(url('2', 'export-humanizer'));
    await expect(page.getByRole('tab').nth(4)).toHaveAttribute('aria-selected', 'true');
  });
  await check('unknown grant never falls back to another grant', async () => {
    await page.goto(url('missing-grant', 'drafting'));
    await visible('Instrument fault');
    assert.equal(new URL(page.url()).pathname, '/grants/missing-grant/drafting');
    assert.equal(
      (await page.locator('body').innerText()).includes('Community Health Access'),
      false
    );
    assert.equal(
      (await page.locator('body').innerText()).includes('Climate Resilience Infrastructure'),
      false
    );
  });
  await check('development navigation emits no unexpected runtime errors', () => {
    assert.deepEqual(diagnostics, []);
  });
} finally {
  if (browser) await browser.close();
  fs.mkdirSync(path.join(root, '.expo/s8'), { recursive: true });
  fs.writeFileSync(path.join(root, '.expo/s8/routes-startup.log'), startupLog);
  stop();
  const cleanupDeadline = Date.now() + 5000;
  while (!childExited && child.pid && Date.now() < cleanupDeadline) await delay(50);
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
