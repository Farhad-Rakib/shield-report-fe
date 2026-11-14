import { test, expect, sidebar, pageTitle } from './support/fixtures';

// Every sidebar link from GET /menu, grouped as the sidebar shows them, with the page heading
// each must render.
const SECTIONS: { heading: string; links: { title: string; path: string; h1: RegExp }[] }[] = [
  {
    heading: 'Operations',
    links: [
      { title: 'Engagements', path: '/engagements', h1: /^Engagements$/ },
      { title: 'Client Organizations', path: '/clients', h1: /^Client Organizations$/ },
      { title: 'Client Assets', path: '/assets', h1: /^Client Assets$/ },
      { title: 'Scans', path: '/scans', h1: /^Scans$/ },
    ],
  },
  { heading: 'Findings', links: [{ title: 'Vulnerabilities', path: '/vulnerabilities', h1: /^Vulnerabilities$/ }] },
  {
    heading: 'Scanning',
    links: [
      { title: 'Tool Configuration', path: '/scan-tools', h1: /Tool Configuration/ },
      { title: 'Custom Tools', path: '/custom-tools', h1: /^Custom Tools$/ },
    ],
  },
  {
    heading: 'AI',
    links: [
      { title: 'Providers & Models', path: '/llm-providers', h1: /^Providers & Models$/ },
      { title: 'Prompt Library', path: '/llm-prompts', h1: /^Prompt Library$/ },
    ],
  },
  { heading: 'Reporting', links: [{ title: 'Report Templates', path: '/report-templates', h1: /^Report Templates$/ }] },
  {
    heading: 'Administration',
    links: [
      { title: 'Users', path: '/users', h1: /^Users$/ },
      { title: 'Roles', path: '/roles', h1: /^Roles$/ },
      { title: 'Permissions', path: '/permissions', h1: /^Permissions$/ },
      { title: 'User Roles', path: '/users/roles', h1: /^User Roles$/ },
      { title: 'Role Permissions', path: '/roles/permissions', h1: /^Role Permissions$/ },
      { title: 'Registration Invites', path: '/registration-invites', h1: /^Registration Invites$/ },
      { title: 'Audit Log', path: '/audit-logs', h1: /Audit Log/ },
    ],
  },
];

test.describe('navigation smoke', () => {
  test('sidebar shows every section heading in order', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = sidebar(page);
    await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    const headings = nav.locator('nav > div > button[aria-expanded]');
    await expect(headings).toHaveText(SECTIONS.map((s) => new RegExp(`^${s.heading}$`, 'i')));
  });

  test('collapsing a section hides its links and expanding restores them', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = sidebar(page);
    const heading = nav.getByRole('button', { name: 'Administration' });
    await heading.click();
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: 'Audit Log' })).toHaveCount(0);
    await heading.click();
    await expect(nav.getByRole('link', { name: 'Audit Log' })).toBeVisible();
  });

  for (const section of SECTIONS) {
    test(`every ${section.heading} page renders without errors`, async ({ page, health }) => {
      await page.goto('/dashboard');
      await expect(pageTitle(page)).toHaveText(/Dashboard/);
      for (const link of section.links) {
        await test.step(link.title, async () => {
          const item = sidebar(page).getByRole('link', { name: link.title, exact: true });
          await item.click();
          await expect(page).toHaveURL(new RegExp(`${link.path.replace(/\//g, '\\/')}$`));
          await expect(item).toHaveAttribute('aria-current', 'page');
          await expect(pageTitle(page)).toHaveText(link.h1);
          // Let the page's queries settle, then make sure none of them failed visibly.
          await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
          await expect(page.getByText('Something went wrong')).toHaveCount(0);
          await expect(page.getByText(/^(Failed to load|Request failed)/)).toHaveCount(0);
          await health.assertNoRenderLoop(link.path);
          health.assertClean();
        });
      }
    });
  }

  // A refresh or a pasted link goes through the web server, not the client router: every page
  // must come back as the app (regression: /assets returned nginx 403).
  test('every page also works as a deep link / on refresh', async ({ page }) => {
    for (const link of SECTIONS.flatMap((s) => s.links)) {
      await test.step(link.path, async () => {
        const res = await page.goto(link.path);
        expect(res?.status(), `${link.path} HTTP status`).toBe(200);
        await expect(pageTitle(page)).toHaveText(link.h1);
      });
    }
  });

  test('deep link to an unknown route shows the 404 page inside the app', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  });
});
