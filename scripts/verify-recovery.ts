import { test, expect, type Page } from '@playwright/test';
import { LAYOUT, BREAKPOINTS } from '../src/config/layout';

// Like verify:tokens, this CLI types its small Node boundary without adding Node
// declarations to the app's dependency/config surface. Runtime modules remain genuine.
declare const __dirname: string;
interface ChildProcess {
  pid?: number;
  exitCode: number | null;
  stdout: { on(event: 'data', callback: (chunk: unknown) => void): void } | null;
  stderr: { on(event: 'data', callback: (chunk: unknown) => void): void } | null;
  once(event: 'error', callback: (error: Error) => void): void;
  once(event: 'exit', callback: (code: number | null) => void): void;
}
interface Response {
  writeHead(status: number): Response;
  setHeader(name: string, value: string): void;
  end(data?: Uint8Array | string): void;
}
interface Server {
  listening: boolean;
  once(event: 'error', callback: (error: Error) => void): void;
  listen(port: number, host: string, callback: () => void): void;
  address(): { port: number } | string | null;
  close(callback: (error?: Error) => void): void;
  closeAllConnections(): void;
}
let spawn: (
  exe: string,
  args: string[],
  options: { cwd: string; windowsHide: boolean; detached: boolean; stdio: string[] }
) => ChildProcess;
let spawnSync: (
  exe: string,
  args: string[],
  options: { windowsHide: boolean; stdio: string; timeout: number }
) => unknown;
let createServer: (listener?: (request: { url?: string }, response: Response) => void) => Server;
let createRequire: (file: string) => { resolve(module: string): string };
let readFileSync: (file: string) => Uint8Array;
let existsSync: (file: string) => boolean;
let statSync: (file: string) => { isFile(): boolean };
let path: {
  sep: string;
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  extname(file: string): string;
};
let delay: (ms: number) => Promise<void>;

// Preliminary capability tests stay separately selectable; app acceptance below renders Expo.
test('preliminary harness: isolated Chromium renders and handles an action', async ({ page }) => {
  const diagnostics: string[] = [];
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<button type="button">Harness action</button><output>0</output>');
  await page.evaluate(() => {
    document.querySelector('button')!.addEventListener('click', () => {
      document.querySelector('output')!.textContent = '1';
    });
  });
  await page.getByRole('button', { name: 'Harness action', exact: true }).click();
  await expect(page.locator('output')).toHaveText('1');
  expect(diagnostics).toEqual([]);
});

test('preliminary harness: captures exactly one known fault without suppressing diagnostics', async ({
  page,
}) => {
  const errors: string[] = [];
  const consoleDiagnostics: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleDiagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<main>Harness diagnostic fixture</main>');
  await page.addScriptTag({ content: 'throw new Error("GRANTUM_HARNESS_EXPECTED_FAULT")' });
  await expect.poll(() => errors).toEqual(['GRANTUM_HARNESS_EXPECTED_FAULT']);
  await expect(page.getByRole('main')).toHaveText('Harness diagnostic fixture');
  expect(errors).toEqual(['GRANTUM_HARNESS_EXPECTED_FAULT']);
  expect(consoleDiagnostics).toEqual([]);
});

test.describe('app recovery:', () => {
  let root: string;
  let expoCLI: string;
  const children: ChildProcess[] = [];
  const servers: Server[] = [];
  let devOrigin: string;
  let releaseOrigin: string;

  const stop = (child: ChildProcess) => {
    if (!child.pid || child.exitCode !== null) return;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000,
      });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if ((error as { code?: string }).code !== 'ESRCH') throw error;
      }
    }
  };
  const cleanupOnExit = () => children.forEach(stop);
  const command = (args: string[]) => {
    let log = '';
    const child = spawn(process.execPath, [expoCLI, ...args], {
      cwd: root,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    for (const stream of [child.stdout, child.stderr]) {
      stream?.on('data', (chunk) => {
        log = (log + String(chunk)).slice(-12000);
      });
    }
    const complete = new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`Expo exit ${code}: ${log.slice(-500)}`))
      );
    });
    // A running dev server is intentionally stopped during teardown; observe all rejections.
    complete.catch(() => {});
    return { child, complete };
  };
  const listen = (server: Server) =>
    new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, 'localhost', () => {
        servers.push(server);
        const address = server.address();
        if (!address || typeof address === 'string') reject(new Error('No owned server port'));
        else resolve(address.port);
      });
    });
  const close = (server: Server) =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });

  test.beforeAll(async () => {
    test.setTimeout(120000);
    const modules = {
      child: 'node:child_process',
      http: 'node:http',
      module: 'node:module',
      fs: 'node:fs',
      path: 'node:path',
      timers: 'node:timers/promises',
    };
    ({ spawn, spawnSync } = await import(modules.child));
    ({ createServer } = await import(modules.http));
    ({ createRequire } = await import(modules.module));
    ({ readFileSync, existsSync, statSync } = await import(modules.fs));
    path = (await import(modules.path)).default;
    ({ setTimeout: delay } = await import(modules.timers));
    root = path.resolve(__dirname, '..');
    expoCLI = createRequire(path.join(root, 'package.json')).resolve('expo/bin/cli');
    process.on('exit', cleanupOnExit);
    const exporting = command([
      'export',
      '--platform',
      'web',
      '--output-dir',
      '.expo/recovery-export',
    ]);
    try {
      await Promise.race([
        exporting.complete,
        delay(80000).then(() => {
          throw new Error('Expo export timeout');
        }),
      ]);
    } finally {
      stop(exporting.child);
    }
    const exportRoot = path.join(root, '.expo/recovery-export');
    const mime: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.ttf': 'font/ttf',
      '.woff2': 'font/woff2',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
    };
    const release = createServer((req, res) => {
      const requested = decodeURIComponent(
        new URL(req.url ?? '/', 'http://localhost').pathname
      ).replace(/^\/+/, '');
      let file = path.resolve(exportRoot, requested);
      if (file !== exportRoot && !file.startsWith(exportRoot + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if (!path.extname(file)) file = path.join(exportRoot, 'index.html');
      if (!existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
      res.end(readFileSync(file));
    });
    releaseOrigin = `http://localhost:${await listen(release)}`;
    const reservation = createServer();
    const port = await listen(reservation);
    await close(reservation);
    const dev = command(['start', '--web', '--localhost', '--port', String(port)]);
    devOrigin = `http://localhost:${port}`;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (dev.child.exitCode !== null) await dev.complete;
      try {
        if ((await fetch(devOrigin)).ok) return;
      } catch {
        /* owned server is starting */
      }
      await delay(100);
    }
    throw new Error('Owned Metro readiness timeout');
  });
  test.afterAll(async () => {
    for (const server of servers) if (server.listening) await close(server);
    children.forEach(stop);
    const deadline = Date.now() + 2000;
    const alive = () =>
      children.filter((child) => {
        if (!child.pid) return false;
        try {
          process.kill(child.pid, 0);
          return true;
        } catch (error) {
          if ((error as { code?: string }).code === 'ESRCH') return false;
          throw error;
        }
      });
    while (alive().length && Date.now() < deadline) await delay(50);
    expect(alive(), 'All owned Expo processes must stop').toHaveLength(0);
    process.removeListener('exit', cleanupOnExit);
  });

  const observe = (page: Page) => {
    const diagnostics: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type()))
        diagnostics.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (error) => diagnostics.push({ type: 'pageerror', text: error.message }));
    return diagnostics;
  };
  const setTheme = (page: Page, mode: string) =>
    page.addInitScript((mode) => {
      localStorage.setItem(
        'grantum-theme-storage',
        JSON.stringify({ state: { mode, hasExplicitChoice: true }, version: 0 })
      );
    }, mode);

  for (const mode of ['dark', 'light']) {
    for (const [label, target, repeats, restored] of [
      ['Test screen recovery', 'SCREEN', 1, 'Dev Gallery'],
      ['Test repeated failure', 'SCREEN', 2, 'Dev Gallery'],
      ['Test root recovery', 'ROOT', 1, 'Good morning, Alex.'],
      ['Test tab recovery', 'TAB', 1, 'Good morning, Alex.'],
    ] as const) {
      test(`${mode} ${target} ${repeats} real throw and retry`, async ({ page }) => {
        test.setTimeout(30000);
        await setTheme(page, mode);
        const diagnostics = observe(page);
        await page.goto(`${devOrigin}/dev-gallery`);
        await expect(page.getByText('Dev Gallery', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: label, exact: true }).click();
        for (let index = 0; index < repeats; index++) {
          await expect(page.getByText('Instrument fault', { exact: true })).toBeVisible();
          await expect(page.getByTestId('recovery-fallback')).not.toContainText(
            'GRANTUM_RECOVERY_'
          );
          await page.getByRole('button', { name: 'Try again', exact: true }).click();
        }
        await expect(page.getByText(restored, { exact: true })).toBeVisible();
        expect(diagnostics).toHaveLength(repeats);
        for (const item of diagnostics) {
          expect(item.type).toBe('error');
          expect(item.text).toContain(`Error: GRANTUM_RECOVERY_${target}\n`);
          expect(item.text).toContain('error boundary you provided, Try.');
        }
      });
    }
    for (const width of [320, 768, 1280]) {
      for (const action of ['retry', 'reload'] as const) {
        test(`${mode} ${width} release screen fault, ${action}, privacy and container`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 900 });
          await setTheme(page, mode);
          const diagnostics = observe(page);
          await page.addInitScript(() => {
            const append = Node.prototype.appendChild;
            let armed = sessionStorage.getItem('grantum-test-fault') !== 'clear';
            Node.prototype.appendChild = function <T extends Node>(child: T): T {
              if (armed && child.textContent === 'Good morning, Alex.')
                throw new Error('GRANTUM_DOM_SCREEN_FAULT');
              return append.call(this, child) as T;
            };
            window.addEventListener('grantum-test-clear', () => {
              armed = false;
            });
          });
          await page.goto(releaseOrigin);
          await expect(
            page.getByText(
              'A rendering error occurred in this view. Reload to restore the instrument.',
              { exact: true }
            )
          ).toBeVisible();
          await expect(page.locator('body')).not.toContainText('GRANTUM_DOM_SCREEN_FAULT');
          await expect(page.locator('body')).not.toContainText('Test root recovery');
          await expect(page.getByRole('tab', { name: 'Discovery' })).toBeVisible();
          await page.evaluate(() => {
            window.dispatchEvent(new Event('grantum-test-clear'));
            sessionStorage.setItem('grantum-test-fault', 'clear');
          });
          if (action === 'retry') {
            const retryButton = page.getByRole('button', { name: 'Try again', exact: true });
            // Header navigation precedes content on wide layouts. Walk genuine Tab
            // order within the visible-control bound; never force focus or skip it.
            const focusSteps =
              (await page.getByRole('tab').count()) + (await page.getByRole('button').count()) + 1;
            for (let step = 0; step < focusSteps; step++) {
              await page.keyboard.press('Tab');
              if (await retryButton.evaluate((element) => element === document.activeElement))
                break;
            }
            await expect(retryButton).toBeFocused();
            await page.keyboard.press('Enter');
          } else {
            await Promise.all([
              page.waitForNavigation(),
              page.getByRole('button', { name: 'Reload Grantum', exact: true }).click(),
            ]);
          }
          await expect(page.getByText('Good morning, Alex.', { exact: true })).toBeVisible();
          const container = await page.getByTestId('screen-container').boundingBox();
          const content = await page.getByTestId('screen-content').boundingBox();
          expect(container).not.toBeNull();
          expect(content).not.toBeNull();
          expect(content!.x - container!.x).toBe(
            width >= BREAKPOINTS.md ? LAYOUT.pagePaddingDesktop : LAYOUT.pagePaddingMobile
          );
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth)
          ).toBeLessThanOrEqual(width);
          await page.getByRole('tab', { name: 'Discovery' }).click();
          await expect(page).toHaveURL(/discovery$/);
          expect(diagnostics).toHaveLength(1);
          expect(diagnostics[0].type).toBe('error');
          expect(diagnostics[0].text).toContain('Error: GRANTUM_DOM_SCREEN_FAULT\n');
        });
      }
    }
  }
});
