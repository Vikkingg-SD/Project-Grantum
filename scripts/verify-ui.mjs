/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json'));
const { spawnSync } = require('node:child_process');
const { loadPolicy, childEnvironment } = require('./scripts/runtime-policy.cjs');
const runtime = loadPolicy();
const { chromium, expect } = require('@playwright/test');
const build = path.resolve(process.env.GRANTUM_UI_BUILD || '.expo/ui-verification');
if (!process.env.GRANTUM_UI_BUILD) {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('expo/bin/cli'),
      'export',
      '--platform',
      'web',
      '--max-workers',
      String(runtime.workers),
      '--output-dir',
      build,
    ],
    {
      env: childEnvironment(runtime),
      stdio: 'inherit',
      windowsHide: true,
      timeout: runtime.exportMs,
    }
  );
  assert.equal(result.status, 0, result.error?.message || 'Web export failed');
}
const output = path.resolve(process.env.GRANTUM_UI_OUTPUT || '.expo/ui-results');
fs.mkdirSync(output, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = createServer((req, res) => {
  const requested = path.resolve(
    build,
    '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  );
  if (
    !requested.startsWith(build.replaceAll('/', path.sep) + path.sep) &&
    requested !== path.resolve(build)
  ) {
    res.writeHead(403).end();
    return;
  }
  const file =
    fs.existsSync(requested) && fs.statSync(requested).isFile()
      ? requested
      : path.join(build, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, timeout: runtime.navigationMs });
const findings = [],
  captures = [],
  diagnostics = [];
const routes = [
  ['dashboard', 'Your workspace'],
  ['discovery-studio', 'Find your next opportunity'],
  ['drafting', 'Drafting workspace'],
  ['audit-studio', 'Application check'],
  ['export-humanizer', 'Review & export'],
  ['post-award-tracker', 'Reporting & activity'],
];
async function check(name, fn) {
  try {
    await fn();
    findings.push({ name, passed: true });
    process.stdout.write(`PASS ${name}\n`);
  } catch (e) {
    findings.push({ name, passed: false, error: e.message });
    process.stdout.write(`FAIL ${name}: ${e.message}\n`);
  }
}
try {
  for (const width of [320, 390, 768, 1280])
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(runtime.expectMs);
      page.setDefaultNavigationTimeout(runtime.navigationMs);
      page.on('pageerror', (e) => diagnostics.push(e.message));
      for (const [route, title] of routes) {
        await page.goto(`${origin}/grants/1/${route}`);
        const heading = page.getByRole('heading', {
          name: route === 'dashboard' && width >= 768 ? 'Welcome back, Alex.' : title,
          exact: true,
        });
        // Dashboard greeting is data-owned.
        const target =
          route === 'dashboard' && width >= 768
            ? page.getByRole('heading', { name: /Welcome back/ })
            : heading;
        await target.waitFor();
        await page.evaluate(() => document.fonts.ready);
        await check(
          `Given ${width}px ${theme} ${route}, when rendered, then centered and contained`,
          async () => {
            const bounds = await target.boundingBox();
            const alignment = await target.evaluate((el) => getComputedStyle(el).textAlign);
            assert.equal(alignment, 'center');
            assert.ok(
              Math.abs(bounds.x + bounds.width / 2 - width / 2) < 2,
              JSON.stringify(bounds)
            );
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              'document overflow'
            );
            const outside = await page
              .locator('[role="button"],[role="heading"],[role="textbox"],[role="tab"]')
              .evaluateAll((els) =>
                els
                  .filter((el) => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
                  })
                  .map((el) => el.textContent)
              );
            assert.deepEqual(outside, []);
            if (route === 'discovery-studio') {
              await expect(page.getByText(/^Project Profile \d+% Done$/)).toBeVisible();
              const applyButton = await page
                .getByRole('button', { name: 'Help me apply', exact: true })
                .first()
                .boundingBox();
              const detailsButton = await page
                .getByRole('button', { name: 'View details', exact: true })
                .first()
                .boundingBox();
              assert.ok(
                applyButton.x > detailsButton.x + detailsButton.width,
                `Help me apply must be to the right of View details: ${JSON.stringify({ detailsButton, applyButton })}`
              );
              if (width <= 390) {
                const expectedRight = width - 16 - 1 - 16;
                assert.ok(
                  Math.abs(applyButton.x + applyButton.width - expectedRight) <= 4,
                  `Help me apply right edge (${applyButton.x + applyButton.width}) must align with card inner right (${expectedRight})`
                );
              }
            }
            if (route === 'dashboard') {
              await expect(
                page.getByRole('button', { name: 'New application', exact: true })
              ).toHaveCount(0);
              const badge = await page.getByText(/^Profile \d+% done$/).boundingBox();
              const button = await page
                .getByRole('button', { name: 'Show all', exact: true })
                .boundingBox();
              assert.ok(Math.abs(badge.y + badge.height / 2 - button.y - button.height / 2) < 2);
            }
            if (route === 'drafting') {
              const button = await page
                .getByRole('button', { name: 'Required sections (6/6)', exact: true })
                .boundingBox();
              assert.equal(Math.round(button.width), Math.min(width, 1280) - 32);
            }
          }
        );
        if (width === 390 || width === 1280) {
          const file = `${width}-${theme}-${route}.png`;
          await page.screenshot({ path: path.join(output, file) });
          captures.push(file);
        }
      }
      await context.close();
    }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(runtime.expectMs);
  page.setDefaultNavigationTimeout(runtime.navigationMs);
  page.on('pageerror', (e) => diagnostics.push(e.message));
  await page.goto(`${origin}/grants/1/dashboard`);
  await page.getByRole('heading', { name: 'Your workspace', exact: true }).waitFor();
  await check(
    'Given motion preferences, when changed live, then button feedback respects reduced motion',
    async () => {
      const button = page.getByRole('button', { name: 'Continue drafting', exact: true });
      await expect
        .poll(() => button.evaluate((el) => getComputedStyle(el).transitionDuration))
        .toBe('0.12s');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect
        .poll(() => button.evaluate((el) => getComputedStyle(el).transitionDuration))
        .toBe('0s');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect
        .poll(() => button.evaluate((el) => getComputedStyle(el).transitionDuration))
        .toBe('0.12s');
    }
  );
  await check(
    'Given paged navigation, when advancing and returning, then continuation is visible and routes work',
    async () => {
      await expect(page.getByRole('tab', { name: 'Dashboard', exact: true })).toHaveText(
        'Dashboard'
      );
      await expect(page.getByRole('tab', { name: 'Discovery', exact: true })).toHaveText(
        'Discovery…'
      );
      await expect(page.getByRole('button', { name: 'Previous navigation tabs' })).toBeDisabled();
      await page.getByRole('button', { name: 'Next navigation tabs' }).click();
      await expect(page.getByRole('tab', { name: 'Drafting', exact: true })).toHaveText('Drafting');
      await expect(page.getByRole('tab', { name: 'Audit', exact: true })).toHaveText('Audit…');
      await page.getByRole('button', { name: 'Next navigation tabs' }).click();
      await expect(page.getByRole('tab', { name: 'Export', exact: true })).toHaveText('…Export');
      await expect(page.getByRole('tab', { name: 'Post-award', exact: true })).toHaveText(
        'Post-award'
      );
      await expect(page.getByRole('button', { name: 'Next navigation tabs' })).toBeDisabled();
      await page.getByRole('tab', { name: 'Post-award', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Reporting & activity' })).toBeVisible();
      await page.getByRole('button', { name: 'Go to dashboard' }).click();
    }
  );
  await check(
    'Given discovery, when filters and empty results change, then recovery remains usable',
    async () => {
      await page.getByRole('tab', { name: 'Discovery', exact: true }).click();
      const filter = page.getByRole('button', { name: 'Filter grants', exact: true });
      await expect(filter.locator('svg')).toHaveCount(1);
      await filter.click();
      await expect(filter).toHaveAttribute('aria-expanded', 'true');
      await page
        .getByRole('textbox', { name: 'Search the grant index' })
        .fill('no matching opportunity xyz');
      await expect(
        page.getByRole('heading', { name: 'No grants match your exact criteria' })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(page.getByText('3 sample opportunities', { exact: true })).toBeVisible();
      await filter.click();
    }
  );
  await check(
    'Given drafting, when a requirement is changed, then status and audit agree',
    async () => {
      await page.getByRole('button', { name: 'Help me apply', exact: true }).first().click();
      await page.getByRole('button', { name: 'Required sections (6/6)', exact: true }).click();
      await page.getByRole('button', { name: 'Mark missing', exact: true }).first().click();
      await expect(
        page.getByRole('button', { name: 'Required sections (5/6)', exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Restore all sections', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Required sections (6/6)', exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Required sections (6/6)', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Chat with agent', exact: true })
        .fill('Review the implementation timeline');
      await page.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(
        page.getByText('Review the implementation timeline', { exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'File references', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const docBtn = await page
        .getByRole('button', { name: 'Choose document', exact: true })
        .boundingBox();
      const sheetBtn = await page
        .getByRole('button', { name: 'Choose spreadsheet', exact: true })
        .boundingBox();
      const mediaBtn = await page
        .getByRole('button', { name: 'Choose photos & videos', exact: true })
        .boundingBox();
      assert.ok(
        Math.abs(docBtn.y - sheetBtn.y) <= 2 &&
          Math.abs(docBtn.width - sheetBtn.width) <= 2 &&
          Math.abs(docBtn.width - mediaBtn.width) <= 2 &&
          Math.abs(docBtn.x - mediaBtn.x) <= 2,
        `Attachment option grid must form a rigid 2-column grid: ${JSON.stringify({ docBtn, sheetBtn, mediaBtn })}`
      );
      for (let index = 0; index < 5; index++) {
        await page.locator('input[type=file]').setInputFiles({
          name: `Reference-${index}-long-project-budget-and-delivery-evidence.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 test reference'),
        });
      }
      await expect(
        page.getByText('Remove a reference to add another.', { exact: true })
      ).toBeVisible();
      const removeLast = page.getByRole('button', {
        name: 'Remove Reference-4-long-project-budget-and-delivery-evidence.pdf',
        exact: true,
      });
      await removeLast.scrollIntoViewIfNeeded();
      const overflowingButtons = await page
        .getByRole('dialog')
        .locator('[role="button"]')
        .evaluateAll((els) =>
          els
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.left < 0 || rect.right > innerWidth);
            })
            .map((el) => el.getAttribute('aria-label'))
        );
      assert.deepEqual(overflowingButtons, []);
      await removeLast.click();
      await expect(
        page.getByText('Remove a reference to add another.', { exact: true })
      ).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('tab', { name: 'Audit', exact: true }).click();
      await page.getByRole('button', { name: 'Audit prompts', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Budget', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Run audit', exact: true }).click();
      await expect(page.getByText('Checklist check passed', { exact: true })).toBeVisible();
    }
  );
  await check(
    'Given export and reporting, when selecting formats and tabs, then preview constraints stay explicit',
    async () => {
      await page.getByRole('button', { name: 'Next navigation tabs' }).click();
      await page.getByRole('tab', { name: 'Export', exact: true }).click();
      await page.getByRole('radio', { name: /PDF/ }).click();
      await expect(page.getByRole('button', { name: 'Export bundle', exact: true })).toBeDisabled();
      await page.getByRole('tab', { name: 'Post-award', exact: true }).click();
      await page.getByRole('button', { name: 'Recommendations', exact: true }).click();
      await expect(
        page.getByText('No recommendations available for this application.', { exact: true })
      ).toBeVisible();
    }
  );
  await check(
    'Given a modal, when opened with keyboard and dismissed, then focus returns to its trigger',
    async () => {
      await page.getByRole('button', { name: 'Go to dashboard' }).click();
      const trigger = page.getByRole('button', { name: 'Notifications', exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  );
  await check(
    'Given missing required section, when viewing Audit, then Action required badge uses failure color',
    async () => {
      await page.goto(`${origin}/grants/1/drafting`);
      await page.getByRole('button', { name: 'Required sections (6/6)', exact: true }).click();
      await page.getByRole('button', { name: 'Mark missing', exact: true }).first().click();
      await expect(
        page.getByRole('button', { name: 'Required sections (5/6)', exact: true })
      ).toBeVisible();
      await page.getByRole('tab', { name: 'Audit', exact: true }).click();
      const actionBadge = page.getByText('Action required', { exact: true });
      await expect(actionBadge).toBeVisible();
      const badgeColor = await actionBadge.evaluate((el) => getComputedStyle(el).color);
      assert.equal(badgeColor, 'rgb(255, 90, 95)');
    }
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  fs.writeFileSync(
    path.join(output, 'receipt.json'),
    JSON.stringify(
      {
        findings,
        captures,
        diagnostics,
        sourceHashes: Object.fromEntries(
          [
            'src/screens/DashboardScreen.tsx',
            'src/screens/DiscoveryScreen.tsx',
            'src/screens/DraftingScreen.tsx',
            'src/screens/AuditScreen.tsx',
            'src/screens/ExportScreen.tsx',
            'src/screens/PostAwardScreen.tsx',
            'src/components/molecules/GrantCard.tsx',
            'src/components/molecules/InfoCard.tsx',
            'src/components/molecules/AttachmentOptionGrid.tsx',
            'src/components/molecules/FileReferencePanel.tsx',
            'src/components/organisms/TopTabNavigation.tsx',
            'src/hooks/useAppReady.ts',
            'src/hooks/useReduceMotion.ts',
          ].map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
        ),
      },
      null,
      2
    )
  );
}
assert.equal(diagnostics.length, 0, diagnostics.join('\n'));
assert.equal(findings.filter((x) => !x.passed).length, 0, 'See receipt for failed checks');
