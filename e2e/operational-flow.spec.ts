import fs from 'node:fs';
import { Page } from '@playwright/test';
import { test, expect, dialog, toast, sidebar, pageTitle } from './support/fixtures';
import { Api, Paged, ReportTemplate, Report, Vulnerability, prefix, runId } from './support/api';

// Client org -> asset -> scan authorization (Custom Check) -> engagement -> scans with harmless
// custom alpine tools (never contact the target) -> finding -> report with an E2E template that
// has a required dynamic field filled in the Generate dialog -> edit sections -> preview -> approve -> download.
test.describe.configure({ mode: 'serial' });

const P = () => prefix();
const names = {
  findingTool: () => `${P()}-alpine`,
  findingLabel: () => `E2E Echo Check ${runId()}`,
  streamTool: () => `${P()}-stream`,
  streamLabel: () => `E2E Stream Check ${runId()}`,
  org: () => `${P()} Client Org`,
  asset: () => `${P()} Web App`,
  host: () => `e2e-${runId()}.example.invalid`,
  engagement: () => `${P()} External Pentest`,
  template: () => `${P()}-report-template`,
};

const state: { engagementPath?: string; templateId?: number; findingScanPath?: string } = {};

/** The page's client-organization picker, once it lists our org (it renders after orgs load). */
async function pickOrg(page: Page) {
  await page.locator('select', { has: page.locator('option', { hasText: names.org() }) }).selectOption({ label: names.org() });
}

async function addCustomTool(page: Page, o: { name: string; label: string; args: string[]; output: string; severity?: string }) {
  await page.goto('/custom-tools');
  await page.getByRole('button', { name: 'Add tool' }).click();
  const modal = dialog(page, 'Add custom tool');
  await modal.getByLabel(/^Name \(staff only\)/).fill(o.name);
  await modal.getByLabel(/^Client label/).fill(o.label);
  await modal.getByLabel('Description').fill('Harmless E2E check: prints text, contacts nothing');
  await modal.getByLabel(/^Docker image/).fill('alpine:3.20');
  const args = modal.getByLabel(/^Arguments/);
  await args.fill('echo');
  // Without a target placeholder the tool cannot be saved.
  await expect(modal.getByText(/At least one argument must contain/)).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Add tool' })).toBeDisabled();
  await args.fill(o.args.join('\n'));
  await expect(modal.getByText(/At least one argument must contain/)).toHaveCount(0);
  await modal.getByRole('combobox', { name: /^Output/ }).selectOption({ label: o.output });
  if (o.severity) await modal.getByRole('combobox', { name: /^Default severity/ }).selectOption(o.severity);
  await expect(modal.locator('pre')).toContainText('alpine:3.20');
  await modal.getByRole('button', { name: 'Add tool' }).click();
  await expect(modal).toBeHidden();
  await expect(toast(page, 'Tool added')).toBeVisible();

  const card = page.locator('div.panel').filter({ has: page.getByRole('heading', { name: o.name, exact: true }) });
  await expect(card).toContainText(`Client label: ${o.label}`);
  await card.getByRole('button', { name: 'Test' }).click();
  await expect(card.getByRole('button', { name: 'Pulling…' })).toBeVisible();
  await expect(card.locator('p.text-emerald-600')).toBeVisible({ timeout: 300_000 });
}

test.describe('operational flow', () => {
  test.beforeAll(async () => {
    // Report template with a required dynamic field that its HTML prints (setup via API: pure data
    // entry, the studio UI has its own spec).
    const api = await Api.login();
    const t = await api.post<ReportTemplate>('/ReportTemplates', { name: names.template(), companyDisplayName: 'E2E Security Ltd' });
    state.templateId = t.id;
    await api.put(`/ReportTemplates/${t.id}/fields`, {
      fields: [{ key: 'signoff', label: 'Sign-off', type: 'text', defaultValue: null, help: 'Name of the approving lead', required: true }],
    });
    const builtIn = await api.get<{ htmlContent: string }>(`/ReportTemplates/${t.id}/html`);
    const html = builtIn.htmlContent.replace(/(<body[^>]*>)/i, '$1<p class="e2e-signoff">Signed off by: {{Custom.signoff}}</p>');
    expect(html).toContain('e2e-signoff');
    await api.put(`/ReportTemplates/${t.id}/html`, { htmlContent: html });
    await api.dispose();
  });

  test('register harmless custom tools and pull their image', async ({ page }) => {
    test.setTimeout(420_000);
    await addCustomTool(page, {
      name: names.findingTool(),
      label: names.findingLabel(),
      args: ['echo', 'found {host}'],
      output: 'One finding per line',
      severity: 'Low',
    });
    // Streams ~25 s of output and creates no findings: used for the responsiveness check.
    await addCustomTool(page, {
      name: names.streamTool(),
      label: names.streamLabel(),
      args: ['sh', '-c', 'for i in $(seq 1 50); do echo "progress $i of 50 for {host}"; sleep 0.5; done'],
      output: 'Output only',
    });
  });

  test('register client organization and asset', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Organization' }).click();
    const orgModal = dialog(page, 'Register Client Organization');
    await orgModal.getByLabel('Organization Name').fill(names.org());
    await orgModal.getByLabel('Primary Contact Name').fill('E2E Contact');
    await orgModal.getByLabel('Primary Contact Email').fill(`e2e-${runId()}@example.invalid`);
    await orgModal.getByRole('button', { name: 'Register Organization' }).click();
    await expect(orgModal).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: names.org() })).toBeVisible();

    await sidebar(page).getByRole('link', { name: 'Client Assets', exact: true }).click();
    await expect(pageTitle(page)).toHaveText('Client Assets');
    await pickOrg(page);
    await expect(page.getByText('No assets found')).toBeVisible();
    await page.getByRole('button', { name: 'Add Asset' }).click();
    const assetModal = dialog(page, 'Register New Asset');
    await assetModal.getByLabel('Asset Name').fill(names.asset());
    await assetModal.getByLabel('Asset Type').selectOption('WebUrl');
    await assetModal.getByLabel(/^Identifier/).fill(names.host());
    await assetModal.getByLabel('Environment').selectOption('Staging');
    await assetModal.getByRole('button', { name: 'Register Asset' }).click();
    await expect(assetModal).toBeHidden();
    const row = page.getByRole('row').filter({ hasText: names.asset() });
    await expect(row).toContainText(names.host());
    await expect(row).toContainText('Not Authorized');
  });

  test('record a scan authorization covering Custom Check', async ({ page }) => {
    await page.goto('/assets');
    await pickOrg(page);
    const row = page.getByRole('row').filter({ hasText: names.asset() });
    await row.getByRole('button', { name: 'Scan Authorization' }).click();
    const modal = dialog(page, `Scan Authorization — ${names.asset()}`);
    await expect(modal.getByText(/No active authorization/)).toBeVisible();
    await modal.getByRole('button', { name: 'Record new authorization' }).click();
    await modal.getByLabel('Client contact name').fill('E2E Approver');
    await modal.getByLabel('Client contact email').fill(`approver-${runId()}@example.invalid`);
    for (const label of ['Port Checking', 'Vulnerability Scanning', 'Reconnaissance']) {
      await modal.getByRole('checkbox', { name: label }).uncheck();
    }
    await expect(modal.getByRole('checkbox', { name: 'Custom Check' })).toBeChecked();
    await modal.getByLabel('Notes').fill('E2E: harmless echo tools only');
    await modal.getByRole('button', { name: 'Record authorization' }).click();
    await expect(toast(page, 'Scan authorization recorded')).toBeVisible();
    await expect(modal.getByText(/Scanning is authorized until/)).toContainText('Custom Check');
    await expect(modal.getByText(/Scanning is authorized until/)).not.toContainText('Port Checking');
    await expect(modal.locator('li').first()).toContainText('Active');
    await page.keyboard.press('Escape');
    await expect(row).toContainText('Authorized');
    await expect(row).not.toContainText('Not Authorized');
  });

  test('create an engagement for the client', async ({ page, health }) => {
    await page.goto('/engagements');
    await pickOrg(page);
    await page.getByRole('button', { name: 'New Engagement' }).click();
    const modal = dialog(page, 'New Engagement');
    await modal.getByLabel('Title').fill(names.engagement());
    await modal.getByLabel('Pentester').selectOption({ label: 'Demo Pentester' });
    await modal.getByLabel('Scope').fill(`${names.host()} (E2E, no real traffic)`);
    const today = new Date().toISOString().slice(0, 10);
    await modal.getByLabel('Start Date').fill(today);
    await modal.getByLabel('End Date').fill(today);
    await modal.getByRole('button', { name: 'Create Engagement' }).click();
    await expect(page).toHaveURL(/\/engagements\/\d+$/);
    state.engagementPath = new URL(page.url()).pathname;
    await expect(pageTitle(page)).toHaveText(names.engagement());
    // Regression: a hidden modal on this page used to re-render forever, freezing navigation.
    await page.waitForLoadState('networkidle').catch(() => {});
    await health.assertNoRenderLoop('engagement detail');
    await expect(page.getByText(names.org()).first()).toBeVisible();
    // No scans yet: a report cannot be generated.
    await expect(page.getByRole('button', { name: 'Generate Report' })).toBeDisabled();
    await expect(page.getByText('No scans have been run for this engagement yet.')).toBeVisible();
  });

  async function startScan(page: Page, toolLabel: string) {
    await page.goto(state.engagementPath!);
    await page.getByRole('button', { name: 'Run Scoped Scan' }).click();
    const modal = dialog(page, 'Run Scoped Scan');
    await modal.locator('select').selectOption({ label: `${names.asset()} (${names.host()})` });
    await expect(modal.getByRole('button', { name: 'Start Scan' })).toBeDisabled();
    await modal.getByRole('checkbox', { name: new RegExp(`^${toolLabel}`) }).check();
    await modal.getByRole('button', { name: 'Start Scan' }).click();
    await expect(page).toHaveURL(/\/scans\/[0-9a-f-]{36}$/);
    return new URL(page.url()).pathname;
  }

  test('app stays navigable while scan output streams', async ({ page }) => {
    test.setTimeout(180_000);
    const scanPath = await startScan(page, names.streamLabel());
    // Custom tools show their client label, never "Custom Check" or the staff-only name.
    await expect(pageTitle(page)).toHaveText(`${names.streamLabel()} Scan`);
    const console = page.locator('main').getByText(/progress \d+ of 50/).last();
    await expect(console).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Running', { exact: true }).first()).toBeVisible();

    const timings: number[] = [];
    for (const [title, path] of [
      ['Engagements', '/engagements'],
      ['Vulnerabilities', '/vulnerabilities'],
    ] as const) {
      const started = Date.now();
      await sidebar(page).getByRole('link', { name: title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 2_000 });
      await expect(pageTitle(page)).toHaveText(title, { timeout: 2_000 });
      timings.push(Date.now() - started);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${scanPath}$`));
      // Coming back re-attaches to the live console and new lines keep arriving.
      const before = Number((await page.locator('main').getByText(/progress \d+ of 50/).last().textContent())?.match(/progress (\d+)/)?.[1] ?? 0);
      await expect
        .poll(async () => Number((await page.locator('main').getByText(/progress \d+ of 50/).last().textContent())?.match(/progress (\d+)/)?.[1] ?? 0), {
          timeout: 15_000,
        })
        .toBeGreaterThan(before);
    }
    test.info().annotations.push({ type: 'navigation-ms-while-streaming', description: timings.join(', ') });
    for (const t of timings) expect(t).toBeLessThan(2_000);

    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('main').getByText('progress 50 of 50').last()).toBeVisible();
    await expect(page.getByText('No vulnerabilities were auto-created from this scan.')).toBeVisible();
  });

  test('scan with the finding tool completes and its finding is listed', async ({ page }) => {
    test.setTimeout(180_000);
    state.findingScanPath = await startScan(page, names.findingLabel());
    await expect(pageTitle(page)).toHaveText(`${names.findingLabel()} Scan`);
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible({ timeout: 150_000 });
    await expect(page.locator('main').getByText(`found ${names.host()}`).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vulnerabilities Found (1)' })).toBeVisible();
    const finding = page.getByText(`found ${names.host()}`, { exact: false });
    await expect(finding.first()).toBeVisible();
    // The staff-only tool name never appears on the page.
    await expect(page.locator('main')).not.toContainText(names.findingTool());

    await sidebar(page).getByRole('link', { name: 'Vulnerabilities', exact: true }).click();
    await pickOrg(page);
    const row = page.getByRole('row').filter({ hasText: `found ${names.host()}` });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Low');
    await expect(row).toContainText(names.asset());
    await expect(row).not.toContainText(names.findingTool());
  });

  test('generate a report from the engagement with the dialog', async ({ page }) => {
    await page.goto(state.engagementPath!);
    await expect(page.getByRole('heading', { name: 'Vulnerabilities (1)' })).toBeVisible();
    const generate = page.getByRole('button', { name: 'Generate Report' });
    await expect(generate).toBeEnabled();
    await generate.click();
    const modal = dialog(page, 'Generate Report');
    // No default template: nothing is selected and Generate is disabled until one is chosen.
    const generateBtn = modal.getByRole('button', { name: 'Generate', exact: true });
    const templateSelect = modal.getByLabel('2. Report template');
    await expect(templateSelect).toHaveValue('');
    await expect(generateBtn).toBeDisabled();

    // 1. testing type narrows the template list; changing it away from the engagement's warns.
    await modal.getByLabel('1. Testing type').selectOption('Gray');
    await expect(modal.getByText("Generating also changes the engagement's testing type.")).toBeVisible();
    await expect(templateSelect.locator('option', { hasText: 'Gray Box Testing' })).toHaveCount(1);
    await expect(templateSelect.locator('option', { hasText: 'White Box Testing' })).toHaveCount(0);
    await modal.getByLabel('1. Testing type').selectOption('White');

    // 2. the custom template (offered for every testing type), 3. its required dynamic field.
    await templateSelect.selectOption({ label: names.template() });
    await expect(modal.getByText('Edited HTML')).toBeVisible();
    const signoff = modal.getByLabel(/Sign-off/);
    await expect(signoff).toHaveValue('');
    await expect(generateBtn).toBeDisabled();
    await signoff.fill('E2E Initial Signer');
    await expect(generateBtn).toBeEnabled();
    // Keep the run deterministic and offline: no AI drafting.
    await modal.getByRole('checkbox', { name: /Draft summaries with AI/ }).uncheck();

    const preview = modal.frameLocator('iframe[title="Report preview"]');
    await expect(preview.locator('.e2e-signoff')).toHaveText('Signed off by: E2E Initial Signer', { timeout: 30_000 });
    await expect(preview.locator('body')).toContainText(`found ${names.host()}`);

    const started = Date.now();
    await generateBtn.click();
    await expect(modal).toBeHidden({ timeout: 60_000 });
    const took = Date.now() - started;
    test.info().annotations.push({ type: 'generate-report-ms', description: String(took) });
    expect(took).toBeLessThan(20_000);
    await expect(toast(page, 'Report generated')).toBeVisible();

    const report = page.locator('div.px-4.py-3.space-y-3').filter({ hasText: 'Version 1' });
    await expect(report).toContainText('PendingApproval');
    await expect(report).toContainText(names.template());
    await expect(page.getByRole('heading', { name: 'Reports (1)' })).toBeVisible();
  });

  test('edit sections: required dynamic field blocks saving; preview shows the edits', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto(state.engagementPath!);
    const report = page.locator('div.px-4.py-3.space-y-3').filter({ hasText: 'Version 1' });
    await report.getByRole('button', { name: 'Edit Sections' }).click();
    const modal = dialog(page, 'Edit Report Sections');
    await expect(modal.getByText('Template fields')).toBeVisible();
    // The value entered in the Generate dialog carries over; clearing it is blocked.
    const signoff = modal.getByLabel(/Sign-off/);
    await expect(signoff).toHaveValue('E2E Initial Signer');
    await signoff.fill('');

    const summary = `E2E executive summary ${runId()}`;
    await modal.locator('textarea').first().fill(summary);
    await modal.getByRole('button', { name: 'Save & Regenerate' }).click();
    await expect(toast(page, 'Fill in the required field(s): Sign-off')).toBeVisible();
    await expect(modal).toBeVisible();

    await signoff.fill('E2E Lead Reviewer');
    await modal.getByRole('button', { name: 'Save & Regenerate' }).click();
    await expect(modal).toBeHidden({ timeout: 120_000 });
    await expect(toast(page, 'Report sections saved')).toBeVisible();

    await report.getByRole('button', { name: 'Preview' }).click();
    const previewModal = dialog(page, 'Report Preview');
    const frame = previewModal.frameLocator('iframe[title="Report preview"]');
    await expect(frame.locator('.e2e-signoff')).toHaveText('Signed off by: E2E Lead Reviewer');
    await expect(frame.locator('body')).toContainText(summary);
    await page.keyboard.press('Escape');
    await expect(previewModal).toBeHidden();

    // Values persisted on the server.
    await report.getByRole('button', { name: 'Edit Sections' }).click();
    await expect(dialog(page, 'Edit Report Sections').getByLabel(/Sign-off/)).toHaveValue('E2E Lead Reviewer');
    await page.keyboard.press('Escape');
  });

  test('approve and download PDF and Word', async ({ page, api }, testInfo) => {
    await page.goto(state.engagementPath!);
    const report = page.locator('div.px-4.py-3.space-y-3').filter({ hasText: 'Version 1' });
    await report.getByRole('button', { name: 'Approve' }).click();
    await expect(toast(page, 'Report approved')).toBeVisible();
    await expect(report).toContainText('Approved');
    await expect(report.getByRole('button', { name: 'Edit Sections' })).toHaveCount(0);
    await expect(report.getByRole('button', { name: 'Approve' })).toHaveCount(0);

    const engagementId = Number(state.engagementPath!.split('/').pop());
    const [stored] = await api.get<Report[]>(`/engagements/${engagementId}/reports`);
    expect(stored.status).toBe('Approved');

    // Both buttons must save a real file, named by the server, with the right content.
    const download = async (button: string, ext: string, magic: string) => {
      const downloadP = page.waitForEvent('download', { timeout: 60_000 });
      await report.getByRole('button', { name: button }).click();
      const dl = await downloadP;
      expect(dl.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`, 'i'));
      const path = testInfo.outputPath(dl.suggestedFilename());
      await dl.saveAs(path);
      const bytes = fs.readFileSync(path);
      expect(bytes.length).toBeGreaterThan(10 * 1024);
      expect(bytes.subarray(0, magic.length).toString('latin1')).toBe(magic);
      return { name: dl.suggestedFilename(), size: bytes.length };
    };

    const pdf = await download('Download PDF', 'pdf', '%PDF');
    const word = await download('Download Word', 'docx', 'PK');
    testInfo.annotations.push({ type: 'pdf-download', description: `${pdf.name} ${pdf.size} bytes` });
    testInfo.annotations.push({ type: 'docx-download', description: `${word.name} ${word.size} bytes` });
  });

  // No delete button in the UI; the API path is what cleanup and integrations use. A finding
  // created by a scan used to be undeletable (500: raw scan line FK).
  test('a scan-created finding can be deleted; its raw scan line is kept', async ({ api }) => {
    const engagementId = Number(state.engagementPath!.split('/').pop());
    const vulns = await api.get<Paged<Vulnerability>>(`/vulnerabilities?engagementId=${engagementId}&pageSize=100`);
    const finding = vulns.data.find((v) => v.title.includes(`found ${names.host()}`))!;
    expect(finding).toBeTruthy();
    // Reports are deleted first (an approved report keeps its findings).
    for (const r of await api.get<Report[]>(`/engagements/${engagementId}/reports`)) await api.delete(`/reports/${r.id}`);
    await api.delete(`/vulnerabilities/${finding.id}`);
    const after = await api.get<Paged<Vulnerability>>(`/vulnerabilities?engagementId=${engagementId}&pageSize=100`);
    expect(after.data.map((v) => v.id)).not.toContain(finding.id);
    const publicId = state.findingScanPath!.split('/').pop();
    const raws = await api.get<{ parsedTitle: string | null; resultingVulnerabilityId: number | null }[]>(`/scans/${publicId}/raw-findings`);
    expect(raws.length).toBeGreaterThan(0);
    expect(raws.every((r) => r.resultingVulnerabilityId === null)).toBe(true);
  });
});
