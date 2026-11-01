import { test, expect } from '@playwright/test';

// Deliberately tests the harness rather than pretending to exercise Router boundaries.
// F1-B/C must replace/extend these with real application throw/fallback/retry scenarios.
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
