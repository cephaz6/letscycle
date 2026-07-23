import type { Page } from '@playwright/test';

const RUN_ID = Date.now();
let counter = 0;

export interface Account {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Every account created by the suite uses @example.com so it's covered by the
 * same cleanup convention as the backend's integration tests (see
 * backend/tests/global-setup.ts) — this suite's own globalTeardown purges the
 * same pattern directly.
 */
export function makeAccount(role: string): Account {
  counter += 1;
  return {
    email: `e2e_${RUN_ID}_${counter}_${role}@example.com`,
    password: 'E2ePassw0rd!1',
    displayName: `E2E ${role} ${RUN_ID}${counter}`,
  };
}

/** A short string unique to this run, for titles/keywords tests search for. */
export function uniqueTag(): string {
  counter += 1;
  return `e2e${RUN_ID}${counter}`;
}

/** Fills the signup form and waits for the post-signup landing page. */
export async function signUp(page: Page, account: Account): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Name').fill(account.displayName);
  await page.getByLabel('Email address').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/');
}

/** Fills the login form and waits for the redirect. */
export async function logIn(
  page: Page,
  account: Pick<Account, 'email' | 'password'>,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('/');
}

export interface NewListing {
  title: string;
  description: string;
  category: string;
  priceGbp?: string; // omit for a giveaway
}

/** Fills the sell form and waits for the redirect to the new listing's page. */
export async function createListing(page: Page, listing: NewListing): Promise<string> {
  await page.goto('/sell');
  await page.getByLabel('Title').fill(listing.title);
  await page.getByLabel('Description').fill(listing.description);
  await page.locator('#category').selectOption({ label: listing.category });
  if (listing.priceGbp) {
    await page.locator('#price').fill(listing.priceGbp);
  } else {
    await page.getByRole('button', { name: 'Give away' }).click();
  }
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await page.waitForURL(/\/listings\/[0-9a-f-]{36}/);
  const match = /\/listings\/([0-9a-f-]{36})/.exec(page.url());
  if (!match?.[1]) throw new Error('Listing id not found in URL after publish');
  return match[1];
}
