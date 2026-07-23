import { test, expect } from '@playwright/test';
import { makeAccount, signUp, createListing, uniqueTag } from './utils';

const LIVERPOOL = { latitude: 53.4084, longitude: -2.9916 };

/**
 * Wishlist match end-to-end: a member sets a home location and a wish, another
 * member publishes a matching listing, and the first gets a notification with
 * an actionable "I'm interested". Geolocation is mocked at the browser-context
 * level rather than needing a real device location.
 */
test('a nearby matching listing notifies a member with a saved wish', async ({
  browser,
}) => {
  const watcher = makeAccount('watcher');
  const seller = makeAccount('matchseller');
  const tag = uniqueTag();

  const watcherCtx = await browser.newContext({
    geolocation: LIVERPOOL,
    permissions: ['geolocation'],
  });
  const watcherPage = await watcherCtx.newPage();
  await signUp(watcherPage, watcher);

  // Set a home location (required — matching skips anyone without one).
  await watcherPage.goto('/settings');
  await watcherPage.getByRole('button', { name: 'Use my location' }).click();
  await expect(watcherPage.getByText(/pinned at/i)).toBeVisible();
  await watcherPage.getByRole('button', { name: 'Save location' }).click();
  await expect(watcherPage.getByRole('button', { name: 'Saved' })).toBeVisible();

  // Add a wish matching on keyword, any category, generous distance/price.
  await watcherPage.goto('/wanted');
  await watcherPage.getByRole('button', { name: 'Add your first wish' }).click();
  const keywordInput = watcherPage.getByLabel('Keywords (optional)');
  await keywordInput.fill(tag);
  await keywordInput.press('Enter');
  await watcherPage.getByRole('button', { name: 'Add wish' }).click();
  await expect(watcherPage.getByText(tag)).toBeVisible();

  // A second member publishes a listing near the same spot, matching the tag.
  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await signUp(sellerPage, seller);
  await createListing(sellerPage, {
    title: `Mystery gadget ${tag}`,
    description: `Something to do with ${tag}, honestly not sure what.`,
    category: 'Electronics',
    priceGbp: '10.00',
  });
  await sellerCtx.close();

  // The outbox publisher drains async (polls every ~1s) — give it a moment.
  await watcherPage.waitForTimeout(4000);
  await watcherPage.goto('/notifications');

  const interestButton = watcherPage.getByRole('button', { name: /interested/i });
  await expect(interestButton).toBeVisible({ timeout: 10_000 });
  await interestButton.click();
  await expect(watcherPage.getByText(/interest sent/i)).toBeVisible();

  await watcherCtx.close();
});
