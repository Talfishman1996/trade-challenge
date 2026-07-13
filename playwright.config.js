import { defineConfig } from '@playwright/test';

const testCapability = `${'v'.repeat(32)}.${'s'.repeat(43)}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/._*'],
  outputDir: './tmp/playwright-results',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4198',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `TRADEVAULT_SHARED_CAPABILITY=${testCapability} npm run build && npm run preview -- --host 127.0.0.1 --port 4198`,
    url: 'http://127.0.0.1:4198',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
