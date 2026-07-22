import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Integration tests share one Postgres database. Force a single worker and
    // no file parallelism so suites run strictly serially — otherwise they race
    // on each other's rows and teardown (e.g. matching's global candidate query
    // vs another suite's listings). Slower, but correct for shared-DB tests.
    fileParallelism: false,
    maxWorkers: 1,
    // Clears test rows left behind by a teardown that failed part-way, so one
    // bad run can't cascade into unrelated suites on the next one.
    globalSetup: ['tests/global-setup.ts'],
  },
});
