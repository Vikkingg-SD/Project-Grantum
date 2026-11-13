/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, expect } = require('@playwright/test');
const build = path.resolve(process.argv[2] || '.expo/workspace-ui');
const output = path.resolve(process.argv[3] || '.expo/workspace-ui-results');
fs.mkdirSync(output, { recursive: true });
assert.ok(fs.existsSync(path.join(build, 'index.html')), 'Export the web build first');
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
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
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
const origin = `http://127.0.0.1:${server.address().port}`;
const diagnostics = [];
try {
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        colorScheme: theme,
      });
      await context.addInitScript((mode) => {
        globalThis.localStorage.setItem(
          'grantum-theme-storage',
          JSON.stringify({ state: { mode, hasExplicitChoice: true }, version: 0 })
        );
      }, theme);
      const page = await context.newPage();
      page.on('pageerror', (error) => diagnostics.push(error.message));
      for (const [name, button, route] of [
        ['profile', /^Project:/, '/project-profile'],
        ['works', /^My Works \(/, '/my-works'],
        ['account', /^Role:/, null],
      ]) {
        await page.goto(`${origin}/grants/1/dashboard`);
        await page.getByRole('button', { name: button }).click();
        if (route) {
          await expect(page).toHaveURL(new RegExp(route + '$'));
          await page
            .getByRole('heading', {
              name: name === 'profile' ? 'Project Profile' : 'My Works',
              exact: true,
            })
            .waitFor();
          assert.equal(
            await page.getByRole('dialog').count(),
            0,
            'Primary workflow must not be a modal'
          );
          const columns = page.getByTestId('workspace-columns');
          const bounds = await columns.boundingBox();
          assert.ok(
            width < 1024 || bounds.width >= 1024,
            'Desktop workspace must use the full canvas'
          );
          const direction = await columns.evaluate((el) => getComputedStyle(el).flexDirection);
          assert.equal(direction, width >= 1024 ? 'row' : 'column');
        } else await page.getByRole('button', { name: 'Close', exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready);
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
          return {
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
            borderedDepth: depth,
          };
        });
        findings.push({
          name,
          width,
          theme,
          leaked,
          ...layout,
          screenshot,
          passed: leaked.length === 0 && !layout.documentOverflow && layout.borderedDepth <= 2,
        });
        if (route) {
          await page.goBack();
          await expect(page).toHaveURL(/grants\/1\/dashboard$/);
        } else await page.getByRole('button', { name: 'Close', exact: true }).click();
      }
      // Direct links and reload retain project edits and version history.
      await page.goto(`${origin}/project-profile`);
      const projectName = page.getByRole('textbox', {
        name: 'Project / Venture Name',
        exact: true,
      });
      await expect(projectName).toHaveValue('CleanWater AI Infrastructure');
      await projectName.fill('Stage 2 saved project');
      await page
        .getByRole('textbox', { name: 'Change summary', exact: true })
        .fill('Route persistence regression');
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await page
        .getByRole('button', { name: 'Save profile', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `profile-editor-${width}-${theme}.png`) });
      await page.reload();
      await expect(projectName).toHaveValue('Stage 2 saved project');
      await expect(page.getByText('Route persistence regression', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Community Health & STEM Lab', exact: true }).click();
      await expect(projectName).toHaveValue('Community Health & STEM Lab');
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
      await page.goBack();
      await expect(page).toHaveURL(/my-works$/);
      await page.goto(`${origin}/discover`);
      await page
        .getByRole('heading', { name: 'Find your next opportunity', exact: true })
        .waitFor();
      await page.getByRole('button', { name: /Open project profile$/i }).click();
      await expect(page).toHaveURL(/project-profile$/);
      await page.getByRole('textbox', { name: 'Project / Venture Name', exact: true }).click();
      await expect(
        page.getByRole('textbox', { name: 'Project / Venture Name', exact: true })
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/project-profile$/);
      // A fresh deep link has a safe Back fallback even without an in-app history stack.
      const direct = await context.newPage();
      await direct.goto(`${origin}/project-profile`);
      await direct.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(direct).toHaveURL(/grants\/1\/dashboard$/);
      await direct.close();
      await page.goto(`${origin}/grants/1/dashboard`);
      await page.getByRole('button', { name: /^Role:/ }).click();
      await page.getByRole('button', { name: 'VIEWER', exact: true }).click();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.goto(`${origin}/project-profile`);
      await expect(
        page.getByRole('textbox', { name: 'Project / Venture Name', exact: true })
      ).not.toBeEditable();
      await expect(
        page.getByRole('textbox', { name: 'Core Mission & Value Thesis', exact: true })
      ).not.toBeEditable();
      await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeDisabled();
      findings.push({
        name: 'direct links, save/reload, project switching, empty/filter states, draft handoff and history',
        width,
        theme,
        passed: true,
      });
      await context.close();
    }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(findings, null, 2));
}
process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
assert.ok(
  findings.length === 16 && findings.every((row) => row.passed) && diagnostics.length === 0,
  'Workspace copy/layout regression; see captures and report'
);
