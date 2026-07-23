import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Runs against the already-running docker stack (docker compose up
 * in both backend/ and client/) rather than booting its own server, since that
 * stack is how this project is developed day to day — a separate boot path
 * here would just be a second thing to keep in sync.
 *
 * Deliberately single-worker: these tests share one Postgres database, so
 * parallel runs would race on each other's rows the same way the backend's
 * integration tests do (see backend/vitest.config.ts). One retry (sequential,
 * not parallel, so it doesn't reintroduce that race) absorbs the odd
 * environmental timeout on a busy dev machine without masking a real repeat
 * failure — it still fails after two attempts.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
