import { defineConfig } from '@playwright/test';
import { loadPolicy } from './runtime-policy.cjs';

const runtime = loadPolicy();

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
  timeout: runtime.testMs,
  globalTimeout: runtime.suiteMs,
  expect: { timeout: runtime.expectMs },
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    navigationTimeout: runtime.navigationMs,
    launchOptions: { timeout: runtime.navigationMs },
  },
});
