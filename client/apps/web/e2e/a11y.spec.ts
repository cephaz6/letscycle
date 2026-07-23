import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { makeAccount, signUp } from './utils';

/** Fails the test only on violations that actually block use — not every nit
 *  axe can flag. Anything below that bar is logged so it stays visible. */
async function assertNoSeriousViolations(page: Page, route: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const minor = results.violations.filter(
    (v) => v.impact !== 'critical' && v.impact !== 'serious',
  );
  if (minor.length > 0) {
    // eslint-disable-next-line no-console -- audit visibility, not app logging
    console.log(
      `a11y (${route}) — ${minor.length} lower-impact finding(s): ${minor.map((v) => v.id).join(', ')}`,
    );
  }
  expect(
    blocking,
    blocking
      .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
      .join('\n'),
  ).toEqual([]);
}

const PUBLIC_ROUTES = [
  '/',
  '/search',
  '/how-it-works',
  '/about',
  '/contact',
  '/help',
  '/safety-tips',
  '/terms',
  '/privacy',
  '/cookies',
  '/accessibility',
  '/login',
  '/signup',
];

for (const route of PUBLIC_ROUTES) {
  test(`a11y: ${route} has no critical/serious violations`, async ({ page }) => {
    await page.goto(route);
    await assertNoSeriousViolations(page, route);
  });
}

test.describe('authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, makeAccount('a11y'));
  });

  const AUTHED_ROUTES = ['/me', '/settings', '/sell', '/wanted', '/transactions'];

  for (const route of AUTHED_ROUTES) {
    test(`a11y: ${route} has no critical/serious violations`, async ({ page }) => {
      await page.goto(route);
      await assertNoSeriousViolations(page, route);
    });
  }
});
