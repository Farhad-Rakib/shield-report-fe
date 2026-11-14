import { test as base, expect, Page, Locator } from '@playwright/test';
import { Api } from './api';

export interface PageHealth {
  pageErrors: string[];
  failedApiCalls: string[];
  /** Ignore API failures whose "METHOD url status" line matches (for deliberately bad requests). */
  allowApiFailure: (pattern: RegExp) => void;
  /** Assert nothing went wrong so far (also runs automatically at the end of every test). */
  assertClean: () => void;
  /** Fail if React keeps re-rendering an idle page (render loop). */
  assertNoRenderLoop: (label?: string) => Promise<void>;
}

// React commits per second an idle page may still make (toasts, timers, polling). A render loop
// makes tens of thousands.
const MAX_IDLE_COMMITS_PER_SECOND = 30;

type Fixtures = {
  health: PageHealth;
  api: Api;
};

// Every test gets `health`: uncaught page errors and API responses >= 500 (and 429: the app is
// unusable when rate-limited) are recorded and fail the test at the end. Auto fixture, so specs
// get it without asking for it.
export const test = base.extend<Fixtures>({
  health: [
    async ({ page }, use) => {
      const pageErrors: string[] = [];
      const failedApiCalls: string[] = [];
      const allowed: RegExp[] = [];

      // Minimal React DevTools hook: React reports every commit to it, so a render loop shows up
      // as a commit counter that never stops climbing.
      await page.addInitScript(() => {
        const w = window as unknown as { __e2eCommits: number; __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown };
        w.__e2eCommits = 0;
        if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;
        w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          supportsFiber: true,
          isDisabled: false,
          renderers: new Map(),
          inject: () => 1,
          checkDCE: () => {},
          onScheduleFiberRoot: () => {},
          onPostCommitFiberRoot: () => {},
          onCommitFiberUnmount: () => {},
          onCommitFiberRoot: () => {
            w.__e2eCommits++;
          },
        };
      });

      page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`));
      page.on('response', (res) => {
        const url = res.url();
        if (!url.includes('/api/')) return;
        const status = res.status();
        if (status >= 500 || status === 429) {
          const line = `${res.request().method()} ${url} ${status}`;
          if (!allowed.some((p) => p.test(line))) failedApiCalls.push(line);
        }
      });

      const health: PageHealth = {
        pageErrors,
        failedApiCalls,
        allowApiFailure: (p) => allowed.push(p),
        assertClean: () => {
          expect(pageErrors, 'uncaught page errors').toEqual([]);
          expect(failedApiCalls, 'failed API calls (>=500 or 429)').toEqual([]);
        },
        assertNoRenderLoop: async (label = page.url()) => {
          const commits = () => page.evaluate(() => (window as unknown as { __e2eCommits: number }).__e2eCommits);
          const before = await commits();
          await page.waitForTimeout(1_000);
          const perSecond = (await commits()) - before;
          expect(perSecond, `React commits per idle second on ${label} (render loop?)`).toBeLessThan(MAX_IDLE_COMMITS_PER_SECOND);
        },
      };
      await use(health);
      health.assertClean();
    },
    { auto: true },
  ],
  api: async ({}, use) => {
    const api = await Api.login();
    await use(api);
    await api.dispose();
  },
});

export { expect };

export const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Primary navigation' });

/** Click a sidebar link by its visible title and wait for the route. */
export async function navigateViaSidebar(page: Page, title: string, path: string) {
  await sidebar(page).getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[/]/g, '\\/')}$`));
}

export const pageTitle = (page: Page) => page.locator('main h1').first();

/** The top-most open modal (Modal or ConfirmDialog). */
export const dialog = (page: Page, name?: string | RegExp): Locator =>
  name ? page.getByRole('dialog', { name }).or(page.getByRole('alertdialog', { name })) : page.locator('[role="dialog"],[role="alertdialog"]').last();

export const toast = (page: Page, text: string | RegExp) =>
  page.locator('[role="status"],[role="alert"]').filter({ hasText: text }).first();
