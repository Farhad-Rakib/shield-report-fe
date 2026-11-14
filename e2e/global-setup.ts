import { chromium, FullConfig, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { Api, API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, LlmProvider, LlmPrompt, ScanToolSetting } from './support/api';
import { SNAPSHOT_FILE } from './support/snapshot';
import { STORAGE_STATE } from '../playwright.config';

// Signs in once through the real login form and saves the session for every spec.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost';
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  fs.mkdirSync('e2e-results', { recursive: true });
  fs.writeFileSync('e2e-results/run-id.txt', process.env.E2E_RUN_ID ?? '');

  // The stack may still be starting (e.g. right after `docker compose up`): wait for the API.
  const health = API_URL.replace(/\/api\/v1\/?$/, '/health');
  const deadline = Date.now() + 120_000;
  for (;;) {
    const ok = await fetch(health).then((r) => r.ok).catch(() => false);
    if (ok) break;
    if (Date.now() > deadline) throw new Error(`API not healthy at ${health}`);
    await new Promise((r) => setTimeout(r, 2_000));
  }

  // Snapshot the global settings specs touch, so teardown can put them back even if a spec dies
  // half way. Never overwrite a snapshot from an interrupted run (it holds the true originals).
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    const api = await Api.login();
    const providers = await api.get<LlmProvider[]>('/LlmProviderConfigurations');
    const prompts = await api.get<LlmPrompt[]>('/llm-prompts');
    const scanTools = await api.get<ScanToolSetting[]>('/scan-tools');
    await api.dispose();
    fs.writeFileSync(
      SNAPSHOT_FILE,
      JSON.stringify({ activeProviderId: providers.find((p) => p.isActive)?.id ?? null, prompts, scanTools }, null, 2),
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto('/login');
  await page.getByLabel('Email address').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
