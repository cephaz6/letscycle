import { test, expect } from '@playwright/test';
import { makeAccount, signUp, createListing, uniqueTag } from './utils';

/**
 * The core "signup → list → transact" flow across two real browser sessions
 * (buyer and seller), driven entirely through the UI. Stops at the escrow
 * hold: releasing to `completed` needs a real time-gated wait (48h by
 * default — see backend DEFAULT_HOLD_HOURS), which review-flow.spec.ts covers
 * separately via a seeded transaction rather than waiting it out here.
 */
test('buyer purchases a priced listing through to escrow', async ({ browser }) => {
  const seller = makeAccount('txseller');
  const buyer = makeAccount('txbuyer');
  const tag = uniqueTag();
  const title = `E2E camera ${tag}`;

  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await signUp(sellerPage, seller);
  const listingId = await createListing(sellerPage, {
    title,
    description: `A camera for the buy-flow test — ${tag}.`,
    category: 'Electronics',
    priceGbp: '45.00',
  });

  const buyerCtx = await browser.newContext();
  const buyerPage = await buyerCtx.newPage();
  await signUp(buyerPage, buyer);
  await buyerPage.goto(`/listings/${listingId}`);

  await buyerPage.getByRole('button', { name: 'Buy now' }).click();
  await expect(buyerPage.getByRole('heading', { name: 'Before you buy' })).toBeVisible();
  await buyerPage.getByRole('button', { name: 'Continue' }).click();
  await buyerPage.waitForURL(/\/transactions\/[0-9a-f-]{36}/);

  await expect(buyerPage.getByText(/waiting for/i)).toBeVisible();

  await sellerPage.goto(buyerPage.url());
  await sellerPage.getByRole('button', { name: 'Confirm order' }).click();
  await expect(sellerPage.getByRole('button', { name: 'Confirm pickup' })).toBeVisible();

  await sellerPage.getByRole('button', { name: 'Confirm pickup' }).click();
  await expect(sellerPage.getByText(/waiting for/i)).toBeVisible();

  // Buyer's view re-polls (useTransaction refetches every 5s) rather than
  // needing a manual reload.
  await expect(
    buyerPage.getByRole('button', { name: 'Confirm pickup' }),
  ).toBeVisible({ timeout: 10_000 });
  await buyerPage.getByRole('button', { name: 'Confirm pickup' }).click();

  await expect(buyerPage.getByText(/funds are in escrow/i)).toBeVisible({
    timeout: 10_000,
  });

  await sellerCtx.close();
  await buyerCtx.close();
});
