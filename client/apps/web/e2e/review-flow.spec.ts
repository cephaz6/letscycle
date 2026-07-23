import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { makeAccount, signUp, logIn, createListing, uniqueTag } from './utils';

const DB_CONTAINER = 'backend-db-1';

function psql(sql: string): string {
  // -q suppresses the command-completion tag (e.g. "INSERT 0 1") that psql
  // otherwise prints on its own line after the returned row — without it,
  // that tag rides along in the captured output and corrupts anything built
  // from it (silently: `.trim()` only strips the outer whitespace, not an
  // embedded newline).
  return execFileSync(
    'docker',
    ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'letscycle', '-t', '-A', '-q'],
    { input: sql, encoding: 'utf8' },
  ).trim();
}

/**
 * Reaching a completed order for real means confirming pickup (buy-flow.spec.ts
 * covers that) and then waiting out the escrow hold — 48 hours by default. That
 * isn't something a test suite should sit through, so this seeds the one bit
 * unreachable via the UI (the hold's elapsed time) directly in Postgres, the
 * same way this project's own manual testing has done throughout this build —
 * then drives everything the test actually cares about, the review UI, through
 * the browser.
 */
test('buyer leaves a review on a completed order', async ({ browser }) => {
  const seller = makeAccount('rvseller');
  const buyer = makeAccount('rvbuyer');
  const tag = uniqueTag();
  const title = `E2E chair ${tag}`;

  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await signUp(sellerPage, seller);
  const listingId = await createListing(sellerPage, {
    title,
    description: `A chair for the review test — ${tag}.`,
    category: 'Furniture',
    priceGbp: '20.00',
  });
  await sellerCtx.close();

  const buyerCtx = await browser.newContext();
  const buyerSignupPage = await buyerCtx.newPage();
  await signUp(buyerSignupPage, buyer);
  await buyerCtx.close();

  const ids = psql(
    `select u1.id, u2.id from "user" u1, "user" u2
     where u1.email = '${seller.email}' and u2.email = '${buyer.email}';`,
  );
  const [sellerId, buyerId] = ids.split('|');
  if (!sellerId || !buyerId) {
    throw new Error(`Could not resolve seller/buyer ids from: ${ids}`);
  }

  const txId = psql(
    `insert into "transaction" (
       "listingId", "buyerId", "sellerId", "amountPence", "commissionPence",
       currency, status, "completedAt"
     ) values (
       '${listingId}', '${buyerId}', '${sellerId}', 2000, 200,
       'GBP', 'completed', now()
     ) returning id;`,
  );

  const reviewCtx = await browser.newContext();
  const buyerPage = await reviewCtx.newPage();
  await logIn(buyerPage, buyer);
  await buyerPage.goto(`/transactions/${txId}`);

  await expect(buyerPage.getByText('Order complete')).toBeVisible();
  await buyerPage.getByRole('button', { name: 'Leave a review' }).click();
  await expect(
    buyerPage.getByRole('heading', { name: `Review ${seller.displayName}` }),
  ).toBeVisible();

  await buyerPage.getByRole('button', { name: '5 stars' }).click();
  await buyerPage
    .getByPlaceholder(/share how the sale went/i)
    .fill(`Great handover, thanks! (${tag})`);
  await buyerPage.getByRole('button', { name: 'Submit review' }).click();

  await expect(buyerPage.getByText('Review left')).toBeVisible();

  await reviewCtx.close();
});
