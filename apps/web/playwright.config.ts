import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:3000',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: [
    {
      command: 'pnpm runner:dev',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        APP_ORIGIN: 'http://127.0.0.1:3000',
        RUNNER_PORT: '3001',
        DATABASE_URL: '',
        PRACTICE_SERVICE_TOKEN: '',
        OPENAI_API_KEY: '',
        PRACTICE_GENERATION_ENABLED: '',
        PRACTICE_MODEL: '',
      },
    },
    {
      command: 'pnpm dev',
      url: 'http://127.0.0.1:3000/practice',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
