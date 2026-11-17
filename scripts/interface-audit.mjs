/* global document, innerWidth, getComputedStyle */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

// Run against development Metro: RN Web suppresses some diagnostics in production.
export async function auditInterfaces(browser, origin, runtime) {
  const outputRoot = path.resolve(process.env.GRANTUM_AUDIT_OUTPUT || '.expo/interface-results');
  fs.mkdirSync(outputRoot, { recursive: true });
  const output = fs.mkdtempSync(path.join(outputRoot, 'audit-'));
  process.stdout.write(`Interface evidence: ${output}\n`);
  const results = [],
    diagnostics = [];
  const routes = [
    '/onboarding',
    '/roadmap',
    '/plans',
    '/discover',
    '/my-works',
    '/project-profile',
    '/settings',
    '/admin',
    ...[
      'dashboard',
      'discovery-studio',
      'drafting',
      'audit-studio',
      'export-humanizer',
      'post-award-tracker',
    ].map((leaf) => `/grants/1/${leaf}`),
    '/dev-gallery',
    '/missing-page',
  ];
  for (const [width, theme] of [
    [320, 'dark'],
    [390, 'light'],
    [768, 'light'],
    [1440, 'dark'],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: theme,
      reducedMotion: 'reduce',
    });
    await context.addInitScript((mode) => {
      globalThis.localStorage.setItem(
        'grantum-theme-storage',
        JSON.stringify({ state: { mode, hasExplicitChoice: true }, version: 0 })
      );
    }, theme);
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    page.setDefaultTimeout(runtime.expectMs);
    page.setDefaultNavigationTimeout(runtime.navigationMs);
    page.on('console', (message) => {
      if (message.type() === 'error')
        diagnostics.push({ width, url: page.url(), error: message.text() });
    });
    page.on('pageerror', (error) =>
      diagnostics.push({ width, url: page.url(), error: error.message })
    );
    let sequence = 0;
    async function capture(name) {
      const scroller = await page.evaluateHandle(() => {
        const scope = document.querySelector('[role="dialog"]') || document;
        return (
          [...scope.querySelectorAll('*')]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return (
                rect.width > 100 &&
                rect.height > 150 &&
                el.scrollHeight > el.clientHeight + 2 &&
                /auto|scroll/.test(getComputedStyle(el).overflowY) &&
                el.tagName !== 'TEXTAREA'
              );
            })
            .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] ||
          null
        );
      });
      const dimensions = await scroller.evaluate((el) =>
        el
          ? { height: el.clientHeight, max: el.scrollHeight - el.clientHeight, top: el.scrollTop }
          : null
      );
      const captures = [];
      try {
        const steps = dimensions ? Math.ceil(dimensions.max / (dimensions.height * 0.8)) + 1 : 1;
        assert.ok(steps <= 30, 'Scrollable content exceeds bounded capture coverage');
        for (let index = 0; index < steps; index++) {
          const top = dimensions ? Math.min(dimensions.max, index * dimensions.height * 0.8) : 0;
          if (dimensions)
            await scroller.evaluate((el, offset) => {
              el.scrollTop = offset;
            }, top);
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))
              )
          );
          const file = `${name}${index ? `-scroll-${index}` : ''}.png`;
          await page.screenshot({ path: path.join(output, file), fullPage: true });
          captures.push({ file, top });
        }
      } finally {
        if (dimensions)
          await scroller.evaluate((el, top) => {
            el.scrollTop = top;
          }, dimensions.top);
        await scroller.dispose();
      }
      return captures;
    }
    async function record(name, action) {
      const file = `${width}-${theme}-${++sequence}.png`;
      try {
        await action();
        const captures = await capture(file.replace('.png', ''));
        results.push({ width, theme, name, passed: true, screenshot: file, captures });
      } catch (error) {
        results.push({ width, theme, name, passed: false, error: error.message });
        await page.screenshot({ path: path.join(output, `failed-${file}`) }).catch(() => {});
      }
      process.stdout.write(`${results.at(-1).passed ? 'PASS' : 'FAIL'} ${width}px ${name}\n`);
    }
    const button = (name) => page.getByRole('button', { name, exact: true });
    const goto = async (route) => {
      await page.goto(`${origin}${route}`);
      const titles = {
        '/onboarding': /Explore funding opportunities\./,
        '/roadmap': 'Building Grantum together',
        '/plans': 'Subscriptions, regional pricing & token economics',
        '/discover': 'Find your next opportunity',
        '/my-works': 'My Works',
        '/project-profile': 'Project Profile',
        '/settings': 'Personal settings',
        '/admin': 'Staff administration',
        '/grants/1/dashboard': /Welcome back|Your workspace/,
        '/grants/1/discovery-studio': 'Find your next opportunity',
        '/grants/1/drafting': 'Drafting workspace',
        '/grants/1/audit-studio': 'Application check',
        '/grants/1/export-humanizer': 'Review & export',
        '/grants/1/post-award-tracker': 'Reporting & activity',
        '/dev-gallery': 'Dev Gallery',
        '/missing-page': 'Signal lost',
      };
      await expect(page).toHaveURL(`${origin}${route}`);
      await page.getByRole('heading', { name: titles[route], exact: true }).first().waitFor();
      if (['/discover', '/grants/1/discovery-studio', '/grants/1/dashboard'].includes(route))
        await button('View details').first().waitFor();
      if (route === '/my-works') await button('Open in Drafting Studio').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
    };
    const dismiss = async () => {
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    };
    try {
      for (const route of routes) {
        await record(
          `Given ${route}, when opened directly, then renders without horizontal overflow`,
          async () => {
            await goto(route);
            const inventory = await page
              .locator('[role="button"],[role="tab"],[role="textbox"]')
              .evaluateAll((elements) =>
                elements.map((el) => ({
                  role: el.getAttribute('role'),
                  label: el.getAttribute('aria-label') || el.textContent,
                  expanded: el.getAttribute('aria-expanded'),
                }))
              );
            results.push({ width, theme, route, inventory });
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              'Document overflows viewport'
            );
            const outside = await page
              .locator('[role="button"],[role="tab"],input,textarea')
              .evaluateAll((elements) =>
                elements
                  .filter((el) => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
                  })
                  .map((el) => el.getAttribute('aria-label') || el.textContent)
              );
            assert.deepEqual(outside, [], 'Interactive controls overflow viewport');
          }
        );
      }
      // Narrow and desktop interaction passes; the other widths inspect every page.
      if (width !== 390 && width !== 1440) continue;
      for (const [label, route] of [
        ['Personal settings', '/settings'],
        ['Subscriptions & plans', '/plans'],
        ['Project team', '/project-profile'],
        ['Staff administration', '/admin'],
      ]) {
        await record(`Account menu navigates to ${label} and browser Back returns`, async () => {
          await goto('/discover');
          await button('Account menu').click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await capture(`${width}-account-menu`);
          await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
          await expect(page).toHaveURL((url) => url.pathname === route);
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await page.goBack();
          await expect(page).toHaveURL(`${origin}/discover`);
        });
      }
      await record('Account menu supports close and Escape', async () => {
        await goto('/discover');
        await button('Account menu').click();
        await button('Close menu').click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await button('Account menu').click();
        await dismiss();
      });
      await record('Discover filters and search can be reset', async () => {
        await goto('/discover');
        const toggle = page.getByRole('button', { name: /^Filter grants/ });
        if (await toggle.count()) await toggle.click();
        const search = page.getByRole('textbox', { name: 'Search the grant index', exact: true });
        await search.fill('no-matching-opportunity-123');
        await expect(button('View details')).toHaveCount(0);
        await button('Reset').click();
        await expect(search).toHaveValue('');
        await expect(button('View details').first()).toBeVisible();
      });
      await record('Workspace activity submenu opens every destination and closes', async () => {
        for (const [label, route] of [
          ['Open My Works', '/my-works'],
          ['Open Project Profile', '/project-profile'],
          ['Open project team', '/project-profile'],
          ['View deadlines', '/grants/1/discovery-studio'],
        ]) {
          await goto('/grants/1/dashboard');
          await button('Notifications').click();
          await expect(
            page.getByRole('dialog', { name: 'Workspace activity', exact: true })
          ).toBeVisible();
          await capture(`${width}-activity-menu`);
          await button(label).click();
          await expect(page).toHaveURL(`${origin}${route}`);
          await expect(page.getByRole('dialog')).toHaveCount(0);
        }
        await goto('/grants/1/dashboard');
        await button('Notifications').click();
        await button('Close activity').click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });
      await record('Grant detail preflight choices and profile navigation work', async () => {
        await goto('/discover');
        await button('View details').first().click();
        await expect(page.getByRole('dialog')).toBeVisible();
        const confirmed = page.getByRole('button', { name: /: Confirmed$/ }).first();
        await confirmed.click();
        await expect(confirmed).toHaveAttribute('aria-pressed', 'true');
        await button('Reset preflight checklist').click();
        await expect(confirmed).toHaveAttribute('aria-pressed', 'false');
        await page.screenshot({ path: path.join(output, `${width}-grant-detail.png`) });
        await button('Open Project Profile Dossier to Address Gaps').click();
        await expect(page).toHaveURL(`${origin}/project-profile`);
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });
      await record(
        'Source modal supports validation, cancel and saved-history expansion',
        async () => {
          await goto('/discover');
          await button('Suggest a source').click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await button('Save on this device').click();
          await expect(
            page.getByRole('textbox', { name: 'Source title (required)', exact: true })
          ).toHaveAttribute('aria-invalid', 'true');
          await button('Cancel').click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          const history = page.getByRole('button', { name: /^Your saved sources/ });
          await history.click();
          await expect(history).toHaveAttribute('aria-expanded', 'true');
          await history.click();
          await expect(history).toHaveAttribute('aria-expanded', 'false');
        }
      );
      await record('Drafting options and each workbench tab opens and dismisses', async () => {
        await goto('/grants/1/drafting');
        const composer = page.getByRole('textbox', { name: 'Chat with agent', exact: true });
        assert.ok(
          await composer.evaluate((el) => {
            const style = getComputedStyle(el);
            return (
              el.clientHeight >=
              parseFloat(style.lineHeight) * 2 +
                parseFloat(style.paddingTop) +
                parseFloat(style.paddingBottom)
            );
          }),
          'Composer must display at least two lines without clipping'
        );
        await button('Drafting options').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await button('Tab 2: Quick Convenience Prompts').click();
        await capture(`${width}-drafting-quick-prompts`);
        await button('Tab 1: Form & Track Templates').click();
        await capture(`${width}-drafting-templates-menu`);
        await button('Form templates').click();
        const dialog = page.getByRole('dialog', {
          name: 'Form templates and drafting',
          exact: true,
        });
        await expect(dialog).toBeVisible();
        if (width >= 1024)
          assert.ok(
            (await page.getByTestId('workspace-sheet').boundingBox()).width >= 1000,
            'Workbench requires room for desktop columns'
          );
        for (const label of [
          'Templates',
          'Sections',
          'Requirements',
          'History',
          'Review & handoff',
        ]) {
          await dialog.getByRole('button', { name: label, exact: true }).click();
          await expect(dialog.getByRole('button', { name: label, exact: true })).toHaveAttribute(
            'aria-pressed',
            'true'
          );
          await capture(`${width}-studio-${label.replaceAll(/[^a-z]/gi, '')}`);
        }
        await dismiss();
      });
      await record('File-reference submenu supports each chooser and removal', async () => {
        await goto('/grants/1/drafting');
        await button('File references').click();
        await expect(
          page.getByRole('dialog', { name: 'File references', exact: true })
        ).toBeVisible();
        for (const [label, name, mimeType] of [
          ['Choose document', 'evidence.txt', 'text/plain'],
          ['Choose spreadsheet', 'budget.csv', 'text/csv'],
          ['Choose photos & videos', 'image.png', 'image/png'],
        ]) {
          const chooser = page.waitForEvent('filechooser');
          await button(label).click();
          await (
            await chooser
          ).setFiles({ name, mimeType, buffer: Buffer.from('local reference fixture') });
          await expect(button(`Remove ${name}`)).toBeVisible();
        }
        await capture(`${width}-file-references`);
        for (const name of ['evidence.txt', 'budget.csv', 'image.png']) {
          await button(`Remove ${name}`).click();
          await expect(button(`Remove ${name}`)).toHaveCount(0);
        }
        await dismiss();
      });
      await record('Writing and audit prompt submenus update their composers', async () => {
        for (const [route, toggle, prompts] of [
          [
            '/grants/1/drafting',
            'Writing prompts',
            [
              'Tighten the mission statement',
              'Align budget to funder cap',
              'Add evidence references',
            ],
          ],
          ['/grants/1/audit-studio', 'Audit prompts', ['Budget', 'Eligibility', 'Evidence']],
        ]) {
          await goto(route);
          if (await button(toggle).count()) await button(toggle).click();
          for (const prompt of prompts) {
            await button(prompt).click();
            await expect(
              page.getByRole('textbox', { name: 'Chat with agent', exact: true })
            ).toHaveValue(prompt);
          }
          await capture(`${width}-${toggle.replaceAll(' ', '-')}`);
          if (await button(toggle).count()) await button(toggle).click();
        }
      });
      await record('Required-section deletion can be cancelled', async () => {
        await goto('/grants/1/drafting');
        await page.getByRole('button', { name: /^Required sections/ }).click();
        await button('Delete').first().click();
        await expect(
          page.getByRole('dialog', { name: 'Delete required section', exact: true })
        ).toBeVisible();
        await button('Keep section').click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });
      await record('Project role picker closes after a selection', async () => {
        await goto('/project-profile');
        const picker = page.getByRole('button', { name: /^Role for / }).first();
        await picker.click();
        await expect(picker).toHaveAttribute('aria-expanded', 'true');
        await button('Viewer').click();
        await expect(picker).toHaveAttribute('aria-expanded', 'false');
        await expect(
          page.getByRole('textbox', { name: 'Project name', exact: true })
        ).not.toBeEditable();
        await picker.click();
        await button('Owner').click();
        await expect(
          page.getByRole('textbox', { name: 'Project name', exact: true })
        ).toBeEditable();
        await picker.click();
        await page.keyboard.press('Escape');
        await expect(page).toHaveURL(`${origin}/project-profile`);
        await expect(picker).toHaveAttribute('aria-expanded', 'false');
      });
      await record('My Works filters expand results and recover from empty search', async () => {
        await goto('/my-works');
        const search = page.getByRole('textbox', { name: 'Search your work', exact: true });
        await search.fill('no-matching-work-123');
        await expect(button('Open in Drafting Studio')).toHaveCount(0);
        await search.fill('');
        for (const label of ['Archived Projects', 'All Works']) await button(label).click();
        await expect(button('Open in Drafting Studio').first()).toBeVisible();
      });
      await record('Reporting tabs and local date validation recover', async () => {
        await goto('/grants/1/post-award-tracker');
        for (const label of ['Notifications', 'Recommendations', 'Details'])
          await button(label).click();
        const date = page.getByRole('textbox', {
          name: 'Expected result date (YYYY-MM-DD)',
          exact: true,
        });
        await date.fill('invalid');
        await button('Save milestone dates').click();
        await expect(page.getByRole('alert')).toBeVisible();
        await date.fill('2027-01-20');
        await button('Save milestone dates').click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await page.reload();
        await expect(date).toHaveValue('2027-01-20');
      });
      await record('Budget line editing persists and each export format selects', async () => {
        await goto('/grants/1/audit-studio');
        await page
          .getByRole('textbox', { name: 'Line item description', exact: true })
          .fill('Browser audit line');
        await page.getByRole('textbox', { name: 'Quantity', exact: true }).fill('2');
        await page.getByRole('textbox', { name: 'Unit rate (USD)', exact: true }).fill('25');
        await button('Add budget line item').click();
        await expect(button('Remove budget row: Browser audit line')).toBeVisible();
        await page.reload();
        await expect(button('Remove budget row: Browser audit line')).toBeVisible();
        await button('Remove budget row: Browser audit line').click();
        await expect(button('Remove budget row: Browser audit line')).toHaveCount(0);
        await goto('/grants/1/export-humanizer');
        for (const label of ['Word (.docx)', 'Notebook (.ipynb)', 'PDF (.pdf)', 'Markdown (.md)']) {
          const choice = page.getByRole('radio', { name: label, exact: true });
          await choice.click();
          await expect(choice).toHaveAttribute('aria-checked', 'true');
        }
        await page
          .getByRole('textbox', { name: 'Application narrative', exact: true })
          .fill('Local audit export narrative.');
        for (const extension of ['txt', 'md']) {
          const pending = page.waitForEvent('download');
          await button(`Download .${extension} on this device`).click();
          assert.ok((await pending).suggestedFilename().endsWith(`.${extension}`));
        }
      });
      await record('Plans simulator and roadmap links respond', async () => {
        await goto('/plans');
        for (const label of [
          'Affiliate invited count: 0',
          'Affiliate invited count: 8',
          'Affiliate tier: Free',
          'Affiliate tier: Tier 3',
          'Affiliate subscribed months: 0',
          'Affiliate subscribed months: 6',
        ]) {
          await button(label).click();
          await expect(button(label)).toHaveAttribute('aria-pressed', 'true');
        }
        await button('Open public roadmap').click();
        await expect(page).toHaveURL((url) => url.pathname === '/roadmap');
        await button('View proposed subscriptions & pricing').click();
        await expect(page).toHaveURL((url) => url.pathname === '/plans');
        await button('Back to workspace').click();
        await expect(page).toHaveURL(/\/grants\/1\/dashboard$/);
      });
      await record(
        'Plans returns to the originating grant instead of selecting another application',
        async () => {
          await page.goto(`${origin}/grants/2/drafting`);
          await button('Account menu').click();
          await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Subscriptions & plans', exact: true })
            .click();
          await expect(page).toHaveURL((url) => url.pathname === '/plans');
          await button('Back to workspace').click();
          await expect(page).toHaveURL(`${origin}/grants/2/drafting`);
        }
      );
    } finally {
      await context.tracing.stop({ path: path.join(output, `${width}-${theme}-trace.zip`) });
      await context.close();
      fs.writeFileSync(
        path.join(output, 'report.json'),
        JSON.stringify({ results, diagnostics }, null, 2)
      );
    }
  }
  assert.deepEqual(diagnostics, [], 'Development UI console must be clean');
  assert.deepEqual(
    results.filter((row) => row.passed === false),
    [],
    'Interface audit failures'
  );
}
