import { test, expect, dialog, toast } from './support/fixtures';
import { Api, ReportTemplate, prefix } from './support/api';

test.describe.configure({ mode: 'serial' });

test.describe('report template studio', () => {
  const name = () => `${prefix()}-studio`;
  const hbs = (marker: string) =>
    `<!doctype html><html><head><meta charset="utf-8"><title>{{Engagement.Title}}</title></head>
<body><h1>${marker}</h1><p>Client: {{Client.Name}}</p><p class="approver">Approver: {{Custom.approver}}</p></body></html>`;

  test.afterAll(async () => {
    const api = await Api.login();
    for (const t of (await api.get<ReportTemplate[]>('/ReportTemplates')).filter((x) => x.name === name())) {
      await api.delete(`/ReportTemplates/${t.id}`).catch(() => {});
    }
    await api.dispose();
  });

  const row = (page: import('@playwright/test').Page) => page.getByRole('row').filter({ hasText: name() });

  async function openTemplates(page: import('@playwright/test').Page) {
    await page.goto('/report-templates');
    await page.getByPlaceholder('Search...').fill(name());
  }

  test('create a template', async ({ page }) => {
    await page.goto('/report-templates');
    await page.getByRole('button', { name: 'Add Template' }).click();
    const modal = dialog(page, 'Add Report Template');
    await modal.locator('#name').fill(name());
    await modal.locator('#companyDisplayName').fill('E2E Security Ltd');
    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(toast(page, 'Report template created')).toBeVisible();
    await page.getByPlaceholder('Search...').fill(name());
    await expect(row(page)).toContainText('E2E Security Ltd');
    await expect(row(page)).toContainText('none'); // no dynamic fields yet
    await expect(row(page)).toContainText('built-in template');
  });

  test('add a dynamic field and save it', async ({ page }) => {
    await openTemplates(page);
    await row(page).getByRole('button', { name: 'Dynamic fields' }).click();
    const studio = dialog(page, `Template studio · ${name()}`);
    await expect(studio.getByRole('button', { name: /Dynamic fields \(0\)/ })).toBeVisible();
    await expect(studio.getByText('No dynamic fields.')).toBeVisible();
    await expect(studio.getByRole('button', { name: 'Save fields' })).toBeDisabled();

    await studio.getByRole('button', { name: 'Add field' }).click();
    await studio.getByLabel('Key').fill('approver');
    await studio.getByLabel('Label').fill('Approver');
    await studio.getByLabel('Default value').fill('Jane Default');
    await studio.getByLabel('Help text').fill('Who signs off the report');
    await studio.getByLabel(/Required before approval/).check();
    await expect(studio.getByRole('button', { name: /Dynamic fields \(1\)/ })).toBeVisible();
    await studio.getByRole('button', { name: 'Save fields' }).click();
    await expect(toast(page, 'Dynamic fields saved')).toBeVisible();
    await expect(studio.getByRole('button', { name: 'Save fields' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(row(page)).toContainText('approver');
  });

  test('HTML tab: insert a variable and the dynamic field, save', async ({ page }) => {
    await openTemplates(page);
    await row(page).getByRole('button', { name: 'Template studio: HTML, upload, preview' }).click();
    const studio = dialog(page, `Template studio · ${name()}`);
    const editor = studio.getByLabel('Template HTML');
    await expect(editor).not.toHaveValue('');
    await expect(studio.getByText(/Built-in White \/ Gray \/ Black Box template/)).toBeVisible();
    const before = await editor.inputValue();

    // Insert at the very start so the result is easy to check.
    await editor.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.setSelectionRange(0, 0);
    });
    await studio.getByRole('button', { name: /\{\{Client\.Name\}\}/ }).click();
    await expect(editor).toHaveValue(`{{Client.Name}}${before}`);
    // A single-line field is inserted inline (escaped), not as a block paragraph.
    await studio.getByRole('button', { name: 'Custom.approver' }).click();
    await expect(editor).toHaveValue(`{{Client.Name}}{{Custom.approver}}${before}`);

    await studio.getByRole('button', { name: 'Save HTML' }).click();
    await expect(toast(page, 'Template saved')).toBeVisible();
    await expect(studio.getByText(/^Custom HTML/)).toBeVisible();
    await expect(studio.getByRole('button', { name: 'Reset to built-in' })).toBeVisible();
  });

  test('invalid HTML is rejected on save', async ({ page }) => {
    await openTemplates(page);
    await row(page).getByRole('button', { name: 'Template studio: HTML, upload, preview' }).click();
    const studio = dialog(page, `Template studio · ${name()}`);
    const editor = studio.getByLabel('Template HTML');
    await expect(editor).not.toHaveValue('');
    await editor.fill('<p>{{#if Report.IsDraft}}unclosed block</p>');
    await studio.getByRole('button', { name: 'Save HTML' }).click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('upload a .hbs file and preview it with sample data', async ({ page }) => {
    await openTemplates(page);
    await row(page).getByRole('button', { name: 'Template studio: HTML, upload, preview' }).click();
    const studio = dialog(page, `Template studio · ${name()}`);
    const marker = `E2E upload marker ${Date.now()}`;
    await studio.locator('input[type="file"]').setInputFiles({ name: 'e2e-template.hbs', mimeType: 'text/plain', buffer: Buffer.from(hbs(marker)) });
    await expect(toast(page, 'Template uploaded and validated')).toBeVisible();
    await expect(studio.getByLabel('Template HTML')).toHaveValue(new RegExp(marker));

    await studio.getByRole('button', { name: 'Preview' }).click();
    const frame = studio.frameLocator('iframe[title="Template preview"]');
    await expect(frame.getByRole('heading', { name: marker })).toBeVisible({ timeout: 30_000 });
    // Dynamic field default fills in until a report sets a value.
    await expect(frame.locator('p.approver')).toHaveText('Approver: Jane Default');
    await expect(frame.getByText(/^Client: \S+/)).toBeVisible();
  });

  test('delete the template', async ({ page }) => {
    await openTemplates(page);
    await row(page).getByRole('button', { name: 'Delete' }).click();
    await dialog(page, 'Delete Report Template').getByRole('button', { name: 'Delete' }).click();
    await expect(toast(page, 'Report template deleted')).toBeVisible();
    await expect(row(page)).toHaveCount(0);
  });
});
