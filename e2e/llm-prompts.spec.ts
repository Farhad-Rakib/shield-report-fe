import { test, expect, dialog, toast } from './support/fixtures';
import { Api, LlmPrompt } from './support/api';

test.describe.configure({ mode: 'serial' });

test.describe('AI prompt library', () => {
  let prompts: LlmPrompt[] = [];

  test.beforeAll(async () => {
    const api = await Api.login();
    prompts = await api.get<LlmPrompt[]>('/llm-prompts');
    await api.dispose();
    expect(prompts.length).toBe(2);
  });

  // Both prompts end at their built-in default.
  test.afterAll(async () => {
    const api = await Api.login();
    for (const p of await api.get<LlmPrompt[]>('/llm-prompts')) {
      if (p.isCustomized) await api.post(`/llm-prompts/${p.key}/reset`);
    }
    await api.dispose();
  });

  const promptButton = (page: import('@playwright/test').Page, p: LlmPrompt) =>
    page.getByRole('button').filter({ hasText: p.name }).filter({ hasText: /Default|Customized/ });

  test('both prompts are listed and selectable', async ({ page }) => {
    await page.goto('/llm-prompts');
    for (const p of prompts) {
      await expect(promptButton(page, p)).toBeVisible();
      await promptButton(page, p).click();
      await expect(page.locator('.panel-title').first()).toHaveText(p.name);
      await expect(page.getByText(p.key, { exact: true })).toBeVisible();
      await expect(page.getByLabel('Prompt template')).toHaveValue(p.template);
    }
  });

  test('edit, validation, placeholder insert, save, test, reset', async ({ page, api }) => {
    const p = prompts[0];
    const required = p.requiredPlaceholders[0];
    await page.goto('/llm-prompts');
    await promptButton(page, p).click();
    const editor = page.getByLabel('Prompt template');
    const save = page.getByRole('button', { name: 'Save', exact: true });
    await expect(editor).toHaveValue(p.template);
    await expect(save).toBeDisabled(); // nothing changed yet

    // Removing a required placeholder blocks saving and says what is missing.
    const withoutRequired = p.template.split(required).join('');
    await editor.fill(withoutRequired);
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await expect(page.getByText(`Must contain: ${required}`)).toBeVisible();
    await expect(save).toBeDisabled();

    // Inserting it back from the placeholder chips (at the cursor: the end) fixes it.
    await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
    await page.locator('button.code-chip').filter({ hasText: required }).click();
    await expect(page.getByText('Required placeholders and JSON fields present')).toBeVisible();
    await expect(editor).toHaveValue(withoutRequired + required);
    await expect(save).toBeEnabled();

    // Discard returns to the saved text.
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(editor).toHaveValue(p.template);

    // Real edit + save.
    const edited = `${p.template}\n\nE2E marker: keep answers short.`;
    await editor.fill(edited);
    await save.click();
    await expect(toast(page, 'Prompt saved')).toBeVisible();
    await expect(promptButton(page, p).getByText('Customized')).toBeVisible();
    await expect(page.getByText('Unsaved changes')).toHaveCount(0);
    const saved = (await api.get<LlmPrompt[]>('/llm-prompts')).find((x) => x.key === p.key)!;
    expect(saved.isCustomized).toBe(true);
    expect(saved.template).toBe(edited);

    // Test sends the prompt to the active provider and always shows a result panel, success or
    // not (the local Gemini key is over quota, which must show as a failure, not break the page).
    await page.getByRole('button', { name: 'Test', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Testing…' })).toBeVisible();
    const resultTitle = page.getByRole('heading', { name: /Reply is valid JSON|Reply received|Test failed/ });
    await expect(resultTitle).toBeVisible({ timeout: 95_000 });
    await expect(page.getByText('Prompt sent (sample values)')).toBeVisible();

    // Reset to default (confirm dialog).
    await page.getByRole('button', { name: 'Reset to default' }).click();
    const confirm = dialog(page, 'Reset prompt');
    await confirm.getByRole('button', { name: 'Reset' }).click();
    await expect(toast(page, 'Prompt reset')).toBeVisible();
    await expect(promptButton(page, p).getByText('Default')).toBeVisible();
    await expect(editor).toHaveValue(p.template);
    expect((await api.get<LlmPrompt[]>('/llm-prompts')).find((x) => x.key === p.key)!.isCustomized).toBe(false);
  });

  test('second prompt: missing JSON field blocks save; switching prompts keeps each text', async ({ page }) => {
    const p = prompts[1];
    await page.goto('/llm-prompts');
    await promptButton(page, p).click();
    const editor = page.getByLabel('Prompt template');
    const field = p.expectedJsonFields[0];
    await editor.fill(p.template.split(field).join('renamed'));
    await expect(page.getByText(new RegExp(`Must contain: .*${field}`))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();

    await promptButton(page, prompts[0]).click();
    await expect(editor).toHaveValue(prompts[0].template);
    await promptButton(page, p).click();
    await expect(editor).toHaveValue(p.template);
  });
});
