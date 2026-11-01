import { defineConfig } from '@playwright/test';

// F1-A only: this browser capability smoke is not app recovery acceptance.
// Browser provisioning is explicit, outside tests. No server or external origin is started.
export default defineConfig({
  testDir: '.',
  testMatch: 'verify-recovery.ts',
  outputDir: '../.expo/recovery-results',
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 15000,
  globalTimeout: 60000,
  expect: { timeout: 5000 },
  reporter: 'list',
  use: { browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
});
