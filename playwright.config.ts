import { defineConfig, devices } from '@playwright/test';

// One id per `playwright test` invocation. Set here (main process) so every worker inherits it;
// every record the suite creates is named `E2E-<runId>-…` and removed in global teardown.
process.env.E2E_RUN_ID ??= `${Date.now().toString(36)}`;

export const STORAGE_STATE = 'e2e/.auth/superadmin.json';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // The suite shares one real database and one SuperAdmin; specs that change global settings
  // (providers, prompts, tool settings) restore them, and the long operational flow runs alone in
  // its own worker, so a small amount of parallelism is safe.
  fullyParallel: false,
  workers: 3,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e-results/results.json' }],
    ['html', { outputFolder: 'e2e-results/html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE },
    },
  ],
});
