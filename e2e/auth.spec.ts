import { test, expect, toast } from './support/fixtures';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/api';

// Own session: logging out must not revoke the shared one the other specs use.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('auth', () => {
  test('unauthenticated visit redirects to login', async ({ page }) => {
    await page.goto('/engagements');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('bad password shows an error and stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('Wrong-Password-123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(toast(page, /invalid|incorrect|failed/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('login, then logout', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('main h1').first()).toHaveText(/Dashboard/);

    await page.getByRole('button', { name: /Super Admin/ }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);

    // The session is really gone: protected pages bounce back to login.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
