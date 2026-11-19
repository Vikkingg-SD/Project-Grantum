/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, expect } = require('@playwright/test');
const remote = process.argv[2]?.startsWith('https://') ? new URL(process.argv[2]).origin : null;
const build = remote ? null : path.resolve(process.argv[2] || '.expo/workspace-ui');
const output = path.resolve(
  (process.argv[3]?.startsWith('--') ? undefined : process.argv[3]) || '.expo/workspace-ui-results'
);
fs.mkdirSync(output, { recursive: true });
if (!remote) assert.ok(fs.existsSync(path.join(build, 'index.html')), 'Export the web build first');
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
};
const server = createServer((req, res) => {
  const requested = path.resolve(build, '.' + new URL(req.url, 'http://localhost').pathname);
  if (requested !== build && !requested.startsWith(build + path.sep)) {
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
if (!remote) await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const findings = [];
const prohibited = [
  /Inspired by HackMD/i,
  /NotebookLM/i,
  /connects via backend/i,
  /Deterministic dossier readiness preview/i,
  /Storage persistence:/i,
  /View drafts & match reports:\s*YES/i,
  /GitHub \+ Grants.gov/i,
];
const origin = remote || `http://127.0.0.1:${server.address().port}`;
const diagnostics = [];
const focusOnly = process.argv.includes('--focus-only');
try {
  for (const width of [320, 390, 1440])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        colorScheme: theme,
      });
      if (remote) {
        await context.route('**/*', (route) => {
          if (!['GET', 'HEAD'].includes(route.request().method())) {
            diagnostics.push(`Blocked mutating network request: ${route.request().method()}`);
            return route.abort();
          }
          return route.continue();
        });
      }
      await context.addInitScript(
        ({ mode, expectedOrigin }) => {
          if (globalThis.location.origin !== expectedOrigin) return;
          globalThis.localStorage.setItem(
            'grantum-theme-storage',
            JSON.stringify({ state: { mode, hasExplicitChoice: true }, version: 0 })
          );
        },
        { mode: theme, expectedOrigin: origin }
      );
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => diagnostics.push(error.message));
      context.on('page', (opened) => {
        opened.on('pageerror', (error) => diagnostics.push(error.message));
        opened.on('console', (message) => {
          if (message.type() === 'error') diagnostics.push(message.text());
        });
      });
      page.on('console', (message) => {
        if (message.type() === 'error') diagnostics.push(message.text());
      });
      if (focusOnly) {
        await page.goto(`${origin}/project-profile`);
        await page.getByRole('button', { name: /^Fix Project lead/ }).click();
        const lead = page.getByRole('textbox', { name: 'Project lead', exact: true });
        await expect(lead).toBeFocused();
        const bounds = await lead.boundingBox();
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900, 'Fix action must reveal input');
        findings.push({
          name: 'readiness fix reveals and focuses input',
          width,
          theme,
          passed: true,
        });
        await context.close();
        continue;
      }
      await page.goto(`${origin}/onboarding`);
      await expect(page.getByText('Explore funding opportunities.', { exact: true })).toBeVisible();
      await expect(page.getByText(/Scores do not verify eligibility or evidence/)).toBeVisible();
      await page.screenshot({ path: path.join(output, `onboarding-${width}-${theme}.png`) });
      await page.goto(`${origin}/dev-gallery`);
      await expect(page.getByRole('heading', { name: 'Signal lost', exact: true })).toBeVisible();
      findings.push({
        name: 'honest onboarding and unavailable release gallery',
        width,
        theme,
        passed: true,
      });
      for (const [name, route, heading] of [
        ['profile', '/project-profile', 'Project Profile'],
        ['works', '/my-works', 'My Works'],
        ['settings', '/settings', 'Personal settings'],
        ['admin', '/admin', 'Staff administration'],
      ]) {
        await page.goto(`${origin}${route}`);
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
        assert.equal(
          await page.getByRole('dialog').count(),
          0,
          'Sustained workflows must be pages'
        );
        if (name === 'profile' || name === 'works') {
          const columns = page.getByTestId('workspace-columns');
          const bounds = await columns.boundingBox();
          assert.ok(
            width < 1024 || bounds.width >= 1024,
            'Desktop workspace must use the full canvas'
          );
          assert.equal(
            await columns.evaluate((el) => getComputedStyle(el).flexDirection),
            width >= 1024 ? 'row' : 'column'
          );
        }
        if (name !== 'admin')
          await expect(
            page.getByRole('heading', { name: 'Needs attention', exact: true })
          ).toHaveCount(0);
        if (name !== 'settings')
          await expect(
            page.getByRole('textbox', { name: 'Display name', exact: true })
          ).toHaveCount(0);
        await page.evaluate(() => document.fonts.ready);
        if (name === 'profile') {
          const preview = page.getByTestId('check-preview-mission');
          const singleLine = await preview.evaluate(
            (el) =>
              el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) + 1
          );
          assert.ok(singleLine, 'Completed checklist previews must stay on one line');
        }
        const text = await page.locator('body').innerText();
        const leaked = prohibited.filter((pattern) => pattern.test(text)).map(String);
        const screenshot = `${name}-${width}-${theme}.png`;
        await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
        const layout = await page.evaluate(() => {
          const boxes = [...document.querySelectorAll('div')].filter((el) => {
            const s = getComputedStyle(el);
            return ['Top', 'Right', 'Bottom', 'Left'].every(
              (edge) =>
                parseFloat(s[`border${edge}Width`]) >= 1 && s[`border${edge}Style`] !== 'none'
            );
          });
          const depth = Math.max(
            0,
            ...boxes.map((el) => {
              let count = 1;
              for (let p = el.parentElement; p; p = p.parentElement) if (boxes.includes(p)) count++;
              return count;
            })
          );
          const overflow = [...document.querySelectorAll('[role="button"],input,textarea')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.left < -1 || r.right > window.innerWidth + 1);
            })
            .map((el) => el.getAttribute('aria-label'));
          return {
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
            borderedDepth: depth,
            overflow,
          };
        });
        findings.push({
          name,
          width,
          theme,
          leaked,
          ...layout,
          screenshot,
          passed:
            leaked.length === 0 &&
            !layout.documentOverflow &&
            layout.borderedDepth <= 2 &&
            layout.overflow.length === 0,
        });
      }
      await page.goto(`${origin}/grants/1/dashboard`);
      await expect(page.getByRole('button', { name: /^Profile 92% done/ })).toBeVisible();
      await page.getByRole('button', { name: /^Project:/ }).click();
      await expect(page).toHaveURL(/project-profile$/);
      await page.getByRole('button', { name: /^Fix Project lead/ }).click();
      const lead = page.getByRole('textbox', {
        name: 'Project lead',
        exact: true,
      });
      await expect(lead).toBeFocused();
      const leadBounds = await lead.boundingBox();
      assert.ok(
        leadBounds.y >= 0 && leadBounds.y + leadBounds.height <= 900,
        'Fix action must reveal the actual input'
      );
      await lead.fill('Project lead for application');
      await expect(page.getByText('100% complete', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Unsaved preview · save to update linked badges.', { exact: true })
      ).toBeVisible();
      const projectName = page.getByRole('textbox', {
        name: 'Project name',
        exact: true,
      });
      await projectName.fill('Saved workspace project');
      await page
        .getByRole('textbox', { name: 'Change summary', exact: true })
        .fill('Readiness and route regression');
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await expect(
        page.getByText('Unsaved preview · save to update linked badges.', { exact: true })
      ).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Save profile', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `profile-editor-${width}-${theme}.png`) });
      await page.reload();
      await expect(projectName).toHaveValue('Saved workspace project');
      await expect(page.getByText('Readiness and route regression', { exact: true })).toBeVisible();
      await page.goto(`${origin}/grants/1/dashboard`);
      await expect(page.getByRole('button', { name: /^Profile 100% done/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Project:.*100% ready/ })).toBeVisible();
      await page.goto(`${origin}/discover`);
      await expect(page.getByRole('button', { name: /^Project Profile 100% Done/ })).toBeVisible();
      findings.push({
        name: 'missing-field focus, saved readiness, shared badges and revision persistence',
        width,
        theme,
        passed: true,
      });

      await page.goto(`${origin}/project-profile`);
      await page.getByRole('button', { name: /^Role for / }).click();
      await page.getByRole('button', { name: 'Viewer', exact: true }).click();
      await expect(projectName).not.toBeEditable();
      await expect(page.getByRole('textbox', { name: 'Mission', exact: true })).not.toBeEditable();
      await page.getByRole('button', { name: 'Community Health & STEM Lab', exact: true }).click();
      await expect(projectName).toBeEditable();
      await page.getByRole('button', { name: 'Saved workspace project', exact: true }).click();
      await expect(projectName).not.toBeEditable();
      await page.getByRole('button', { name: /^Role for / }).click();
      await page.getByRole('button', { name: 'Owner', exact: true }).click();
      await page.goto(`${origin}/my-works`);
      await page
        .getByRole('textbox', { name: 'Search your work', exact: true })
        .fill('no-matching-project');
      await expect(page.getByText('No projects match this search.', { exact: true })).toBeVisible();
      await expect(
        page.getByText('No applications match this filter.', { exact: true })
      ).toBeVisible();
      await page.getByRole('textbox', { name: 'Search your work', exact: true }).fill('');
      await page.getByRole('button', { name: 'Archived Projects', exact: true }).click();
      await expect(page.getByText('No projects match this search.', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'All Works', exact: true }).click();
      await page
        .getByRole('button', { name: 'Open in Drafting Studio', exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(/grants\/1\/drafting$/);
      const openWorkbench = async () => {
        await page.getByRole('button', { name: 'Drafting options', exact: true }).click();
        await page.getByRole('button', { name: 'Form templates', exact: true }).click();
        await expect(
          page.getByRole('dialog', { name: 'Form templates and drafting', exact: true })
        ).toBeVisible();
      };
      await openWorkbench();
      await page.getByRole('button', { name: 'Apply template', exact: true }).click();
      const authored = page.getByRole('textbox', { name: 'Project summary', exact: true });
      await authored.fill('Authored narrative survives a reload');
      await page
        .getByRole('button', {
          name: 'Preview template suggestion for Project summary',
          exact: true,
        })
        .click();
      await expect(
        page.getByText(/Template preview \(no AI or evidence verification\)/)
      ).toBeVisible();
      await expect(page.getByText(/verified against/)).toHaveCount(0);
      await page.getByRole('button', { name: 'Reject suggestion', exact: true }).click();
      await expect(authored).toHaveValue('Authored narrative survives a reload');
      await page
        .getByRole('textbox', { name: 'Version change summary', exact: true })
        .fill('Reload persistence regression');
      await page.getByRole('button', { name: 'Save session version', exact: true }).click();
      await expect(page.getByText(/OWNER · Saved on device/)).toBeVisible();
      await page.reload();
      await openWorkbench();
      await page.getByRole('button', { name: 'Sections', exact: true }).click();
      await expect(authored).toHaveValue('Authored narrative survives a reload');
      await page.getByRole('button', { name: 'History', exact: true }).click();
      await expect(page.getByText('Reload persistence regression', { exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(output, `draft-history-${width}-${theme}.png`) });
      const stored = await page.evaluate(() =>
        globalThis.localStorage.getItem('grantum.workbench.v1')
      );
      assert.ok(stored.includes('Authored narrative survives a reload'));
      assert.ok(!stored.includes('grants.example.org'));
      if (!remote && width === 1440 && theme === 'light') {
        await page.keyboard.press('Escape');
        const tab = (name) => page.getByRole('tab', { name, exact: true });
        const chat = page.getByRole('textbox', { name: 'Chat with agent', exact: true });
        const narrative = page.getByRole('textbox', {
          name: 'Application narrative',
          exact: true,
        });
        const fileDialog = page.getByRole('dialog', { name: 'File references' });
        const openFiles = async () => {
          await page.getByRole('button', { name: 'File references', exact: true }).click();
          await expect(fileDialog).toBeVisible();
        };
        const closeFiles = async () => {
          await fileDialog.getByRole('button', { name: 'Close', exact: true }).click();
          await expect(fileDialog).toBeHidden();
        };
        await chat.fill('Project A drafting note');
        await page.getByRole('button', { name: 'Send message', exact: true }).click();
        await openFiles();
        await page.locator('input[type=file]').setInputFiles({
          name: 'project-a.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 fixture'),
        });
        const file = page.getByRole('button', { name: 'Remove project-a.pdf', exact: true });
        await expect(file).toBeVisible();
        await closeFiles();
        await tab('Export').click();
        await narrative.fill('Project A private application narrative');
        await tab('Drafting').click();
        await chat.fill('Unsent note for project A');
        await openWorkbench();
        const switchProject = async (name) => {
          const dialog = page.getByRole('dialog', { name: 'Form templates and drafting' });
          await dialog.getByRole('button', { name, exact: true }).click();
          await expect(dialog).toBeHidden();
        };
        await switchProject('Community Health & STEM Lab');
        await expect(chat).toHaveValue('');
        const note = page
          .getByText('Project A drafting note', { exact: true })
          .filter({ visible: true });
        await expect(note).toHaveCount(0);
        await openFiles();
        await expect(file).toHaveCount(0);
        await closeFiles();
        await tab('Export').click();
        await expect(narrative).not.toHaveValue('Project A private application narrative');
        await narrative.fill('Project B application narrative');
        await tab('Drafting').click();
        await openWorkbench();
        await switchProject('Saved workspace project');
        await expect(note.first()).toBeVisible();
        await openFiles();
        await expect(file).toBeVisible();
        await closeFiles();
        await tab('Export').click();
        await expect(narrative).toHaveValue('Project A private application narrative');
      }
      await page.goto(`${origin}/discover`);
      await expect(
        page
          .getByRole('button', { name: '94% catalog score. Open profile comparison', exact: true })
          .first()
      ).toBeVisible();
      await expect(page.getByText(/^\d+% match$/)).toHaveCount(0);
      await page.getByRole('button', { name: 'View details', exact: true }).first().click();
      await expect(
        page.getByText(/Local field comparison; evidence and eligibility have not been verified/)
      ).toBeVisible();
      await expect(
        page.getByText(/Verifiable Match Breakdown|Verified Alignment|Official Catalog Ref/)
      ).toHaveCount(0);
      await page.screenshot({
        path: path.join(output, `profile-comparison-${width}-${theme}.png`),
      });
      findings.push({
        name: 'template truth, authored draft and version reload persistence, unverified comparison',
        width,
        theme,
        passed: true,
      });
      await page.goto(`${origin}/my-works`);
      findings.push({
        name: 'project-scoped role controls, readonly editing, search/filter and draft handoff',
        width,
        theme,
        passed: true,
      });

      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('button', { name: 'Personal settings', exact: true }).click();
      await expect(page).toHaveURL(/settings$/);
      await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('Updated name');
      await page.getByRole('switch', { name: 'Deadline and sync digest', exact: true }).click();
      await page.getByRole('button', { name: 'Save settings', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('textbox', { name: 'Display name', exact: true })).toHaveValue(
        'Updated name'
      );
      await expect(
        page.getByRole('switch', { name: 'Deadline and sync digest', exact: true })
      ).not.toBeChecked();
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('button', { name: 'Staff administration', exact: true }).click();
      await expect(page).toHaveURL(/admin$/);
      await page.getByRole('button', { name: 'Retry Job', exact: true }).click();
      await expect(page.getByText('Sample job marked for retry.', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Retry Job', exact: true })).toBeDisabled();
      await expect(page.getByText(/Marked queue item as RETRIED/)).toBeVisible();
      findings.push({
        name: 'avatar menu, separate settings, local preference persistence and sample staff audit',
        width,
        theme,
        passed: true,
      });

      const direct = await context.newPage();
      await direct.goto(`${origin}/project-profile`);
      await direct.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(direct).toHaveURL(/grants\/1\/dashboard$/);
      await direct.close();
      findings.push({ name: 'fresh direct-link back fallback', width, theme, passed: true });
      await context.close();
    }
} finally {
  await browser.close();
  if (!remote) await new Promise((resolve) => server.close(resolve));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(findings, null, 2));
  fs.writeFileSync(path.join(output, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
}
process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
if (diagnostics.length) process.stderr.write(JSON.stringify({ diagnostics }, null, 2) + '\n');
assert.ok(
  findings.length === (focusOnly ? 6 : 60) &&
    findings.every((row) => row.passed) &&
    diagnostics.length === 0,
  'Workspace copy/layout regression; see captures and report'
);
