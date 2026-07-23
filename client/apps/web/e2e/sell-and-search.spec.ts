import { test, expect } from '@playwright/test';
import { makeAccount, signUp, createListing, uniqueTag } from './utils';

test.describe('sell and search', () => {
  test('publishing a listing makes it findable by keyword', async ({ page }) => {
    const seller = makeAccount('seller');
    const tag = uniqueTag();
    const title = `Vintage lamp ${tag}`;

    await signUp(page, seller);
    const listingId = await createListing(page, {
      title,
      description: `A lovely lamp for the search test — ${tag}.`,
      category: 'Home & Kitchen',
      priceGbp: '15.00',
    });

    // The detail page itself renders the title.
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Findable via the search page's keyword filter.
    await page.goto(`/search?q=${encodeURIComponent(tag)}`);
    const result = page.getByRole('link', { name: new RegExp(title) });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(new RegExp(`/listings/${listingId}`));
  });

  test('a giveaway listing is labelled free, not priced', async ({ page }) => {
    const seller = makeAccount('giveaway');
    const tag = uniqueTag();
    const title = `Free box of books ${tag}`;

    await signUp(page, seller);
    await createListing(page, {
      title,
      description: `Clearing shelves — ${tag}.`,
      category: 'Books, Music & Films',
    });

    // Own-listing view (the seller is signed in as its owner): shows the
    // giveaway badge and free price, plus the owner's manage panel rather
    // than a buy/claim action. Scoped to <main> — the header/account menu
    // markup exists in the DOM even while closed and can collide with a
    // page-wide text search, and "Free" alone can match an unrelated
    // giveaway in the "More in this category" section.
    const main = page.getByRole('main');
    await expect(main.getByText('Giveaway')).toBeVisible();
    await expect(page.getByText('Free to a good home')).toBeVisible();
    await expect(main.getByText('Your listing')).toBeVisible();
  });
});
