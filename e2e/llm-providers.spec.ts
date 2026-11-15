import { test, expect, dialog, toast } from './support/fixtures';
import { Api, LlmProvider, prefix } from './support/api';

test.describe.configure({ mode: 'serial' });

test.describe('AI providers & models', () => {
  let originalActiveId: number | null = null;

  test.beforeAll(async () => {
    const api = await Api.login();
    originalActiveId = (await api.get<LlmProvider[]>('/LlmProviderConfigurations')).find((p) => p.isActive)?.id ?? null;
    await api.dispose();
  });

  // Whatever happens, the provider that was active before is active again afterwards.
  test.afterAll(async () => {
    const api = await Api.login();
    const providers = await api.get<LlmProvider[]>('/LlmProviderConfigurations');
    const active = providers.find((p) => p.isActive);
    if (originalActiveId && active?.id !== originalActiveId) await api.post(`/LlmProviderConfigurations/${originalActiveId}/activate`);
    if (!originalActiveId && active) await api.post(`/LlmProviderConfigurations/${active.id}/deactivate`);
    for (const p of providers.filter((x) => x.name.startsWith(prefix()))) {
      await api.post(`/LlmProviderConfigurations/${p.id}/deactivate`).catch(() => {});
      await api.delete(`/LlmProviderConfigurations/${p.id}`).catch(() => {});
    }
    await api.dispose();
  });

  const name = () => `${prefix()}-compat`;
  const card = (page: import('@playwright/test').Page, n: string) =>
    page.locator('div.panel').filter({ has: page.getByRole('heading', { name: n, exact: true }) });

  test('form is provider-aware', async ({ page }) => {
    await page.goto('/llm-providers');
    await page.getByRole('button', { name: 'Add Provider' }).first().click();
    const modal = dialog(page, 'Add LLM Provider');

    // Anthropic (default): no temperature field.
    await expect(modal.getByLabel('Provider', { exact: true })).toHaveValue('Anthropic');
    await expect(modal.getByLabel('Temperature')).toHaveCount(0);
    await modal.getByLabel('Provider', { exact: true }).selectOption('OpenAi');
    await expect(modal.getByLabel('Temperature')).toBeVisible();

    // OpenAI-compatible needs a base URL before it can be saved.
    await modal.getByLabel('Provider', { exact: true }).selectOption('OpenAiCompatible');
    await modal.getByLabel(/^API key/).fill('sk-e2e-not-a-real-key');
    await modal.getByLabel(/^Model/).fill('e2e-model');
    const save = modal.getByRole('button', { name: 'Add provider' });
    await expect(save).toBeDisabled();
    await modal.getByLabel(/^Base URL/).fill('http://127.0.0.1:9/v1');
    await expect(save).toBeEnabled();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();
  });

  test('add an OpenAI-compatible provider; Test reports the failure instead of crashing', async ({ page }) => {
    await page.goto('/llm-providers');
    await page.getByRole('button', { name: 'Add Provider' }).first().click();
    const modal = dialog(page, 'Add LLM Provider');
    await modal.getByLabel('Provider', { exact: true }).selectOption('OpenAiCompatible');
    await modal.getByLabel(/^Name/).fill(name());
    await modal.getByLabel(/^API key/).fill('sk-e2e-not-a-real-key');
    await modal.getByLabel(/^Model/).fill('e2e-model');
    await modal.getByLabel(/^Base URL/).fill('http://127.0.0.1:9/v1');
    await modal.getByRole('button', { name: 'Add provider' }).click();
    await expect(modal).toBeHidden();
    await expect(toast(page, 'Provider added')).toBeVisible();

    const c = card(page, name());
    await expect(c).toBeVisible();
    await expect(c.getByText('Inactive', { exact: true })).toBeVisible();
    await expect(c).toContainText('Other (OpenAI-compatible)');
    await expect(c).toContainText('http://127.0.0.1:9/v1');
    // The key is never echoed back in full.
    await expect(c).not.toContainText('sk-e2e-not-a-real-key');

    await c.getByRole('button', { name: 'Test' }).click();
    await expect(c.getByRole('button', { name: 'Testing…' })).toBeVisible();
    const result = c.locator('div.bg-red-50');
    await expect(result).toBeVisible({ timeout: 70_000 });
    await expect(result).not.toBeEmpty();
    await expect(c.getByRole('button', { name: 'Test' })).toBeEnabled();
    await expect(page.locator('main h1')).toHaveText('Providers & Models');
  });

  test('edit the provider', async ({ page }) => {
    await page.goto('/llm-providers');
    const c = card(page, name());
    await c.getByRole('button', { name: 'Edit' }).click();
    const modal = dialog(page, `Edit ${name()}`);
    await expect(modal.getByLabel('Provider', { exact: true })).toBeDisabled();
    await expect(modal.getByLabel(/^Base URL/)).toHaveValue('http://127.0.0.1:9/v1');
    // Key left blank keeps the stored one.
    await expect(modal.getByLabel(/^API key/)).toHaveValue('');
    await modal.getByLabel(/^Model/).fill('e2e-model-v2');
    await modal.getByLabel('Max output tokens').fill('512');
    await modal.getByRole('button', { name: 'Save changes' }).click();
    await expect(modal).toBeHidden();
    await expect(c).toContainText('e2e-model-v2');
  });

  test('activate, deactivate, then restore the original active provider', async ({ page, api }) => {
    await page.goto('/llm-providers');
    const c = card(page, name());
    await c.getByRole('button', { name: 'Activate' }).click();
    await expect(c.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText(`Active: ${name()}`)).toBeVisible();
    // Only one provider is ever active.
    expect((await api.get<LlmProvider[]>('/LlmProviderConfigurations')).filter((p) => p.isActive).map((p) => p.name)).toEqual([name()]);

    await c.getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByText('No active provider')).toBeVisible();
    await expect(c.getByText('Inactive', { exact: true })).toBeVisible();

    if (originalActiveId) {
      const original = (await api.get<LlmProvider[]>('/LlmProviderConfigurations')).find((p) => p.id === originalActiveId)!;
      const oc = card(page, original.name);
      await oc.getByRole('button', { name: 'Activate' }).click();
      await expect(oc.getByText('Active', { exact: true })).toBeVisible();
      await expect(page.getByText(`Active: ${original.name}`)).toBeVisible();
    }
  });

  test('delete the provider', async ({ page }) => {
    await page.goto('/llm-providers');
    const c = card(page, name());
    await c.getByRole('button', { name: 'Delete' }).click();
    const confirm = dialog(page, 'Delete LLM provider');
    await expect(confirm).toContainText(name());
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(toast(page, 'Provider deleted')).toBeVisible();
    await expect(c).toHaveCount(0);
  });
});
