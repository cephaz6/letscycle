import { test, expect } from '@playwright/test';
import { makeAccount, signUp, logIn } from './utils';

test.describe('auth', () => {
  test('sign up, sign out, and sign back in', async ({ page }) => {
    const account = makeAccount('auth');

    await signUp(page, account);
    // Signed-in shell: the header shows the account menu instead of sign-in links.
    await expect(page.getByLabel('Account menu')).toBeVisible();

    await page.getByLabel('Account menu').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    await logIn(page, account);
    await expect(page.getByLabel('Account menu')).toBeVisible();
  });

  test('rejects the wrong password', async ({ page }) => {
    const account = makeAccount('badpw');
    await signUp(page, account);
    await page.getByLabel('Account menu').click();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await page.goto('/login');
    await page.getByLabel('Email address').fill(account.email);
    await page.getByLabel('Password').fill('DefinitelyWrong123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText(/incorrect|invalid/i)).toBeVisible();
  });
});
