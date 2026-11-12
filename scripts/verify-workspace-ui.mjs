/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
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
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const [name, button] of [
      ['profile', /^Project:/],
      ['works', /^My Works \(/],
      ['account', /^Role:/],
    ]) {
      await page.goto(`http://127.0.0.1:${server.address().port}/grants/1/dashboard`);
      await page.getByRole('button', { name: button }).click();
      await page.getByRole('button', { name: 'Close', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const text = await page.locator('body').innerText();
      const leaked = prohibited.filter((pattern) => pattern.test(text)).map(String);
      const numbered =
        /[1-4]\. (Select or Create|LLM Readiness|Dossier Fields|Personal Account|Platform Staff|Admin Audit)/.test(
          text
        );
      const screenshot = `${name}-${width}.png`;
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
      const layout = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('div')].filter((el) => {
          const s = getComputedStyle(el);
          return ['Top', 'Right', 'Bottom', 'Left'].every(
            (edge) => parseFloat(s[`border${edge}Width`]) >= 1 && s[`border${edge}Style`] !== 'none'
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
        leaked,
        numbered,
        ...layout,
        screenshot,
        passed:
          leaked.length === 0 && !numbered && !layout.documentOverflow && layout.borderedDepth <= 2,
      });
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: button }).waitFor();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(findings, null, 2));
}
process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
assert.ok(
  findings.length === 6 && findings.every((row) => row.passed),
  'Workspace copy/layout regression; see captures and report'
);
