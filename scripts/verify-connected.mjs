import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const backend = 'http://127.0.0.1:5050';
const auth = 'http://127.0.0.1:59099';
const site = 'http://localhost:8081';
const output = process.env.GRANTUM_CONNECTED_ARTIFACTS;
const checks = [];
const diagnostics = [];
const children = [];
const env = {
  ...process.env,
  CI: '1',
  EXPO_NO_DOTENV: '1',
  EXPO_NO_TELEMETRY: '1',
  EXPO_PUBLIC_DATA_SOURCE: 'api',
  EXPO_PUBLIC_API_BASE_URL: backend,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-grantum-local',
  EXPO_PUBLIC_FIREBASE_EMULATOR_ORIGIN: auth,
  EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-grantum-local',
};

function start(command, args, name, cwd = process.cwd()) {
  const child = spawn(command, args, {
    env,
    cwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let tail = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      tail = (tail + String(chunk)).slice(-3000);
    });
  }
  return () => ({ name, tail, code: child.exitCode });
}

async function awaitService(url, service, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (service?.().code !== null && service?.().code !== undefined) {
      throw new Error(JSON.stringify(service()));
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error('Timed out waiting for ' + url + ' ' + JSON.stringify(service?.()));
}

async function credentials() {
  const password = randomUUID();
  const email = randomUUID() + '@example.test';
  const response = await fetch(
    auth + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-grantum-local',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  assert(response.ok, 'Firebase emulator account creation');
  const identity = await response.json();
  return { password, email, token: identity.idToken };
}

async function requestApi(route, token, method = 'GET', body) {
  const response = await fetch(backend + '/api/v1' + route, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  assert(response.ok, method + ' ' + route + ' returned ' + response.status);
  return response.status === 204 ? null : response.json();
}

async function staffFixture(projectPython) {
  const identity = await credentials();
  const account = await requestApi('/auth/session', identity.token, 'POST', {});
  const code = [
    'import os, sys, psycopg',
    'from sqlalchemy.engine import make_url',
    'from manage import environment, load',
    "values = environment(load()) if os.name == 'nt' else os.environ",
    "url = make_url(values['GRANTUM_MIGRATION_URL'])",
    "assert values['GRANTUM_MODE'] == 'local'",
    "assert (url.host, url.port) == ('127.0.0.1', 55432)",
    "assert url.database in ('grantum', 'grantum_test')",
    "with psycopg.connect(url.set(drivername='postgresql').render_as_string(hide_password=False)) as db:",
    "    assert db.execute('UPDATE accounts SET staff = TRUE WHERE id = %s', (sys.argv[1],)).rowcount == 1",
  ].join('\n');
  const result = spawnSync(path.resolve(projectPython), ['-c', code, account.id], {
    cwd: path.resolve('backend'),
    env,
    windowsHide: true,
    timeout: 10000,
  });
  assert.equal(result.status, 0, 'Local staff fixture provisioning');
  return identity;
}

function inspect(page) {
  page.on('pageerror', (error) => diagnostics.push(error.message.split('\n')[0]));
  page.on('console', (message) => {
    if (
      /\[object Object\]|Invalid hook|maximum update depth|Encountered two children/.test(
        message.text()
      )
    ) {
      diagnostics.push(message.text().slice(0, 160));
    }
  });
}

function button(page, name) {
  return page.getByRole('button', { name, exact: true }).last();
}

async function signIn(page, value, url = site) {
  await page.goto(url, { timeout: 150000 });
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible({
    timeout: 150000,
  });
  await page.getByLabel('Test account email', { exact: true }).fill(value.email);
  await page.getByLabel('Test account password', { exact: true }).fill(value.password);
  await button(page, 'Sign in to local Grantum').click();
  const tour = button(page, 'Set up my workspace');
  const workspace = button(page, 'My Works');
  await expect(tour.or(workspace).last()).toBeVisible({ timeout: 45000 });
  if (await tour.isVisible()) await tour.click();
  await expect(workspace).toBeVisible({ timeout: 30000 });
}

async function choose(page, tab, heading = tab) {
  await button(page, tab).click();
  await expect(page.getByRole('heading', { name: heading, exact: true }).last()).toBeVisible({
    timeout: 30000,
  });
}

async function capture(page, name) {
  if (output) await page.screenshot({ path: path.join(output, name), fullPage: false });
}

async function createAttempt(page, title) {
  await choose(page, 'Discovery');
  await page.getByRole('button', { name: 'View opportunity details', exact: true }).first().click();
  await page.getByLabel('Attempt name', { exact: true }).fill(title);
  await button(page, 'Start application attempt').click();
  await expect(page.getByRole('heading', { name: title, exact: true }).last()).toBeVisible({
    timeout: 30000,
  });
}

let browser;
try {
  if (output) await mkdir(output, { recursive: true });
  await awaitService(auth + '/emulator/v1/projects/demo-grantum-local/config', null, 10000);
  const projectPython =
    process.platform === 'win32' ? 'backend/.venv/Scripts/python.exe' : 'backend/.venv/bin/python';
  const apiArgs =
    process.platform === 'win32' ? ['backend/manage.py', 'serve'] : ['-m', 'grantum_api.serve'];
  const apiDir = process.platform === 'win32' ? process.cwd() : path.resolve('backend');
  const api = start(path.resolve(projectPython), apiArgs, 'Flask', apiDir);
  await awaitService(backend + '/readyz', api);
  const metro = start(
    process.execPath,
    [
      require.resolve('expo/bin/cli'),
      'start',
      '--web',
      '--localhost',
      '--clear',
      '--max-workers',
      '1',
      '--port',
      '8081',
    ],
    'Metro'
  );
  await awaitService(site + '/status', metro, 120000);
  const account = await credentials();
  browser = await chromium.launch();
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await desktop.newPage();
  inspect(page);
  await signIn(page, account);
  checks.push('Firebase authentication and server account onboarding');

  await choose(page, 'Project Profile');
  await page.getByLabel('Project name', { exact: true }).fill('Connected verification project');
  await page
    .getByLabel('Project description', { exact: true })
    .fill('A project persisted in the isolated PostgreSQL database.');
  await button(page, 'Create project').click();
  await expect(
    page.getByRole('heading', { name: 'Connected verification project' }).last()
  ).toBeVisible();
  await page
    .getByLabel('Project description', { exact: true })
    .fill('Expanded project scope in PostgreSQL.');
  await page.getByLabel('Change summary', { exact: true }).fill('Added project scope details');
  await button(page, 'Save profile').click();
  await expect(page.getByText(/Revision #2 · Added project scope details/)).toBeVisible();
  await button(page, 'Restore revision #1').click();
  await expect(page.getByText(/Revision #3 · Restored revision #1/)).toBeVisible();
  checks.push('Project profile revision history and historical restore');

  await choose(page, 'Discovery');
  await button(page, 'Central Asia').click();
  await expect(page.getByRole('heading', { name: 'Community Water Access' }).last()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Climate Resilience Infrastructure' })
  ).toHaveCount(0);
  await button(page, 'Clear filters').click();
  await expect(
    page.getByRole('heading', { name: 'Climate Resilience Infrastructure' }).last()
  ).toBeVisible();

  await createAttempt(page, 'First verified attempt');
  await expect(
    page.getByText('Pinned project profile · Revision #3', { exact: true })
  ).toBeVisible();
  for (const label of ['Mission', 'Pain', 'Solution', 'Market', 'Competitors', 'Moat']) {
    await page.getByLabel(label, { exact: true }).fill('Saved field for ' + label);
  }
  await button(page, 'Save application draft').click();
  await expect(page.getByText('100% of required sections complete', { exact: true })).toBeVisible();
  await choose(page, 'Form Templates');
  await button(page, 'Pitch deck').click();
  await button(page, 'Save template changes').click();
  await expect(page.getByText(/Revision 3 · drafting/)).toBeVisible();
  await choose(page, 'Export');
  await button(page, 'Load compiled bundle into export narrative').click();
  const narrativeInput = page.getByLabel('Export narrative', { exact: true });
  await narrativeInput.fill(
    (await narrativeInput.inputValue()) + '\n\nCustom export summary line.'
  );
  await button(page, 'Save export narrative').click();
  await expect(page.getByText(/Revision 4 · drafting/)).toBeVisible();
  const firstHref = page.url();
  await choose(page, 'Audit');
  await button(page, 'Run draft audit').click();
  await expect(page.getByText(/Revision 4 · 100% · Current/)).toBeVisible();
  await choose(page, 'Export');
  const downloadPromise = page.waitForEvent('download');
  await button(page, 'Download Markdown').click();
  const download = await downloadPromise;
  const markdown = await readFile(await download.path(), 'utf8');
  assert(markdown.includes('Requested outputs: application, pitch-deck'));
  assert(markdown.includes('Custom export summary line.'));
  assert(markdown.includes('Saved field for Mission'));
  await capture(page, 'connected-export-1440.png');
  await button(page, 'Dark theme').click();
  await capture(page, 'connected-export-dark-1440.png');
  await button(page, 'Light theme').click();
  await choose(page, 'Progress Tracking');
  await expect(page.getByRole('heading', { name: 'Stage workplan', exact: true })).toBeVisible();
  await button(page, 'Mark done: Review itemized budget lines').click();
  await expect(page.getByText('Review itemized budget lines · 0% · marked done')).toBeVisible();
  await button(page, 'Reopen: Review itemized budget lines').click();
  await expect(page.getByText('Review itemized budget lines · 0% · open')).toBeVisible();
  await capture(page, 'connected-workplan-1440.png');
  checks.push('Discovery filtering, profile pin, template outputs, custom export, and workplan');

  await createAttempt(page, 'Second verified attempt');
  await expect(page.getByText('0% of required sections complete', { exact: true })).toBeVisible();
  await choose(page, 'My Works');
  await expect(button(page, 'Open First verified attempt')).toBeVisible();
  await expect(button(page, 'Open Second verified attempt')).toBeVisible();
  await button(page, 'Open First verified attempt').click();
  await expect(page.getByLabel('Mission', { exact: true })).toHaveValue('Saved field for Mission');
  checks.push('Multiple attempt creation and persisted case-specific data');

  await choose(page, 'Bounty Hunt');
  await page.getByLabel('Source title', { exact: true }).fill('Draft regional source');
  await page
    .getByLabel('Source HTTPS link', { exact: true })
    .fill('https://example.org/draft-only');
  await page.getByLabel('Location / region', { exact: true }).fill('Central Asia');
  await button(page, 'Not published').click();
  await page
    .getByLabel('Why this source belongs in Grantum', { exact: true })
    .fill('Saved unsubmitted draft check.');
  await button(page, 'Save draft').click();
  await expect(page.getByText('Status · draft', { exact: true })).toBeVisible();
  await button(page, 'Delete Draft regional source').click();
  await expect(page.getByRole('heading', { name: 'Draft regional source' })).toHaveCount(0);

  await page.getByLabel('Source title', { exact: true }).fill('New public funding source');
  await page.getByLabel('Source HTTPS link', { exact: true }).fill('https://example.org/grants');
  await page
    .getByLabel('Why this source belongs in Grantum', { exact: true })
    .fill('Public program notice with applicant criteria.');
  await button(page, 'Submit for review').click();
  await expect(page.getByText('Status · pending', { exact: true })).toBeVisible();
  const staff = await staffFixture(projectPython);
  const submissions = await requestApi('/bounties', account.token);
  const source = submissions.find((entry) => entry.title === 'New public funding source');
  assert(source, 'Submitted source is available to its author');
  await requestApi('/staff/bounties/' + source.id + '/review', staff.token, 'POST', {
    status: 'changes_requested',
    note: 'Add a link to the current notice.',
    version: source.version,
  });
  await button(page, 'Dashboard').click();
  await expect(page.getByRole('heading', { name: 'Suggest a funding source' })).toHaveCount(0);
  await choose(page, 'Bounty Hunt');
  await expect(page.getByText('Add a link to the current notice.', { exact: true })).toBeVisible();
  await button(page, 'Revise New public funding source').click();
  await page
    .getByLabel('Revised source HTTPS link', { exact: true })
    .fill('https://example.org/grants/current');
  await button(page, 'Resubmit for review').click();
  await expect(page.getByText('Status · pending', { exact: true })).toBeVisible();
  const queue = await requestApi('/staff/bounties', staff.token);
  assert.equal(
    queue.find((entry) => entry.id === source.id)?.url,
    'https://example.org/grants/current'
  );
  await choose(page, 'Settings');
  await page.getByLabel('Display name', { exact: true }).fill('Connected applicant');
  await button(page, 'Save display name').click();
  await expect(page.getByText('Account settings saved.', { exact: true })).toBeVisible();
  checks.push('Persistent source submission, same-record author revision and account settings');

  const mobile = await browser.newContext({ viewport: { width: 320, height: 812 } });
  const visitor = await mobile.newPage();
  inspect(visitor);
  const colleague = await credentials();
  await signIn(visitor, colleague, firstHref);
  await expect(
    visitor.getByText('This application attempt is unavailable.', { exact: true })
  ).toBeVisible();
  assert.equal(await visitor.getByLabel('Mission', { exact: true }).count(), 0);
  await capture(visitor, 'connected-access-denied-320.png');
  await choose(visitor, 'My Works');
  assert.equal(await button(visitor, 'Open First verified attempt').count(), 0);
  const fits = await visitor.evaluate(
    () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1
  );
  assert(fits, 'Connected workspace fits the 320px viewport');
  checks.push('Account isolation, rejected deep link and compact browser layout');

  const attemptId = new URL(firstHref).searchParams.get('attemptId');
  const current = await requestApi('/attempts/' + attemptId, account.token);
  const membership = '/projects/' + current.projectId + '/members';
  const profile = await requestApi('/auth/me', colleague.token);
  await requestApi(membership, account.token, 'POST', { accountId: profile.id, role: 'editor' });
  await signIn(visitor, colleague, firstHref);
  const mission = visitor.getByLabel('Mission', { exact: true });
  await expect(mission).toHaveValue('Saved field for Mission');
  await mission.fill('Unsaved collaborator edits');
  await requestApi('/attempts/' + attemptId, account.token, 'PATCH', {
    version: current.version,
    title: current.title,
    sections: current.sections.map((section) =>
      section.name === 'Mission' ? { ...section, text: 'Newer owner revision' } : section
    ),
    budget: current.budget,
  });
  await button(visitor, 'Check for saved changes').click();
  await expect(visitor.getByText(/A newer draft has been saved/)).toBeVisible();
  await expect(mission).toHaveValue('Unsaved collaborator edits');
  await expect(button(visitor, 'Save application draft')).toBeDisabled();
  await requestApi(membership + '/' + profile.id, account.token, 'DELETE');
  await button(visitor, 'Check for saved changes').click();
  await expect(
    visitor.getByText('This application attempt is unavailable.', { exact: true })
  ).toBeVisible();
  await expect(mission).toHaveCount(0);
  await visitor.route(backend + '/api/v1/attempts/' + attemptId, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.continue();
    await route.fulfill({
      status: 503,
      headers: { 'Access-Control-Allow-Origin': site },
      json: { error: { message: 'Test outage after access removal.' } },
    });
  });
  await button(visitor, 'Retry loading').click();
  await expect(
    visitor.getByText('This application attempt is unavailable.', { exact: true })
  ).toBeVisible();
  await expect(mission).toHaveCount(0);
  checks.push(
    'Live collaborator conflict preservation and removal of cached draft after access denial'
  );

  await button(page, 'Sign out').click();
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  assert.equal(await page.getByLabel('Mission', { exact: true }).count(), 0);
  assert.deepEqual(diagnostics, []);
  process.stdout.write(JSON.stringify({ status: 'PASS', checks, diagnostics }, null, 2) + '\n');
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill();
}
