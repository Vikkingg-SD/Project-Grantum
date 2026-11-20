// Separate export and browser processes for hosts that cannot hold Metro + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';
import { auditInterfaces } from './interface-audit.mjs';
const require = createRequire(import.meta.url);
const runtime = require('./runtime-policy.cjs').loadPolicy();
const build = path.resolve(process.argv[2] || '.expo/runtime-dev');
assert.ok(fs.existsSync(path.join(build, 'index.html')), 'Export the build first');
const output = path.resolve(process.env.GRANTUM_AUDIT_OUTPUT || '.expo/interface-results');
fs.mkdirSync(output, { recursive: true });
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = createServer((request, response) => {
  const requested = path.resolve(build, '.' + new URL(request.url, 'http://localhost').pathname);
  if (requested !== build && !requested.startsWith(build + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  const file =
    fs.existsSync(requested) && fs.statSync(requested).isFile()
      ? requested
      : path.join(build, 'index.html');
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
// A development export includes HMR clients. Supply an idle transport, since this
// isolated fixture has no Metro process; application diagnostics remain unfiltered.
const sockets = new Set();
server.on('upgrade', (request, socket) => {
  if (!['/hot', '/message'].includes(request.url)) return socket.destroy();
  const accept = createHash('sha1')
    .update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  sockets.add(socket);
  socket.on('data', (buffer) => {
    if ((buffer[0] & 15) === 8) socket.end();
  });
  socket.on('close', () => sockets.delete(socket));
  socket.on('error', () => sockets.delete(socket));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const diagnostics = [];
try {
  browser = await chromium.launch({ headless: true, timeout: runtime.navigationMs });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(runtime.expectMs);
  page.setDefaultNavigationTimeout(runtime.navigationMs);
  page.on('pageerror', (error) => diagnostics.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(message.text());
  });
  try {
    await page.goto(`${origin}/discover`);
    await page.getByRole('button', { name: 'Bounty Hunt', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bounty Hunt', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Submit for Bounty Hunt', exact: true }).click();
    const title = dialog.getByRole('textbox', { name: 'Source title (required)', exact: true });
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await title.fill('Official funding opportunities');
    await dialog
      .getByRole('textbox', { name: 'Official source URL (required)', exact: true })
      .fill('https://foundation.org/funding');
    const confirmedLink = dialog.getByTestId('confirmed-source-link');
    await expect(confirmedLink).toBeVisible();
    await expect(confirmedLink).toHaveAttribute('href', 'https://foundation.org/funding');
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
    await page.getByRole('button', { name: 'Bounty Hunt', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute('aria-invalid', 'false');
    await page.screenshot({ path: path.join(output, 'source-form.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    assert.deepEqual(diagnostics, [], 'Source form must not emit runtime errors');
    process.stdout.write(
      'PASS Given source validation, when errors clear and the form reopens, then no runtime errors\n'
    );
  } finally {
    fs.writeFileSync(
      path.join(output, 'source-diagnostics.json'),
      JSON.stringify(diagnostics, null, 2)
    );
    await context.tracing.stop({ path: path.join(output, 'source-trace.zip') });
    await context.close();
  }
  if (!process.argv.includes('--source-only')) await auditInterfaces(browser, origin, runtime);
} finally {
  if (browser) await browser.close();
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}
