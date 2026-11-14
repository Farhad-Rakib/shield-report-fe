import { test, expect, dialog } from './support/fixtures';

test.describe('modals close on Escape', () => {
  test('Add Provider modal closes on Escape, also with focus in an input', async ({ page }) => {
    await page.goto('/llm-providers');
    await page.getByRole('button', { name: 'Add Provider' }).first().click();
    const modal = dialog(page, 'Add LLM Provider');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    await page.getByRole('button', { name: 'Add Provider' }).first().click();
    await expect(modal).toBeVisible();
    await modal.getByLabel(/^Model/).fill('typing-then-escape');
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    // Re-opening starts from a clean form.
    await page.getByRole('button', { name: 'Add Provider' }).first().click();
    await expect(modal.getByLabel(/^Model/)).toHaveValue('');
    await modal.getByRole('button', { name: 'Close (Esc)' }).click();
    await expect(modal).toBeHidden();
  });

  test('confirm dialog closes on Escape without confirming', async ({ page, api }) => {
    await page.goto('/llm-providers');
    const providersBefore = await api.get<unknown[]>('/LlmProviderConfigurations');
    test.skip(providersBefore.length === 0, 'needs at least one provider card');
    await page.getByRole('button', { name: 'Delete' }).first().click();
    const confirm = dialog(page, 'Delete LLM provider');
    await expect(confirm).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
    expect((await api.get<unknown[]>('/LlmProviderConfigurations')).length).toBe(providersBefore.length);
  });

  test('Add Report Template and Add custom tool modals close on Escape', async ({ page }) => {
    await page.goto('/report-templates');
    await page.getByRole('button', { name: 'Add Template' }).click();
    await expect(dialog(page, 'Add Report Template')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'Add Report Template')).toBeHidden();

    await page.goto('/custom-tools');
    await page.getByRole('button', { name: 'Add tool' }).click();
    await expect(dialog(page, 'Add custom tool')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'Add custom tool')).toBeHidden();
  });
});
