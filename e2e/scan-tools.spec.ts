import { test, expect, toast } from './support/fixtures';
import { Api, ScanToolSetting } from './support/api';

interface ReconSetting extends ScanToolSetting {
  reconftw: { modules: string[]; threads: number };
}

test.describe('scan tool configuration', () => {
  let original: ReconSetting;

  test.beforeAll(async () => {
    const api = await Api.login();
    original = (await api.get<ReconSetting[]>('/scan-tools')).find((t) => t.tool === 'Reconftw')!;
    await api.dispose();
  });

  test.afterAll(async () => {
    const api = await Api.login();
    await api.put('/scan-tools/Reconftw', original);
    await api.dispose();
  });

  test('reconnaissance module checkboxes save, persist and restore', async ({ page, api }) => {
    await page.goto('/scan-tools');
    const reconCard = page.locator('div.p-5.space-y-4').filter({ has: page.getByRole('heading', { name: 'Reconnaissance', level: 2 }) });
    await expect(reconCard).toBeVisible();
    // Clients never see real tool names; staff see the internal name only as a hint.
    await expect(reconCard.getByText(/Internal tool: Reconftw/)).toBeVisible();

    const box = (label: string) => reconCard.getByRole('checkbox', { name: new RegExp(`^${label}`) });
    const geo = box('Geolocation');
    const waf = box('WAF detection');
    const startGeo = await geo.isChecked();
    const startWaf = await waf.isChecked();
    await expect(reconCard.getByText(`${original.reconftw.modules.length} of 26 modules selected`)).toBeVisible();

    await geo.setChecked(!startGeo);
    await waf.setChecked(!startWaf);
    await reconCard.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page, 'Reconnaissance settings saved')).toBeVisible();

    const afterSave = (await api.get<ReconSetting[]>('/scan-tools')).find((t) => t.tool === 'Reconftw')!;
    expect(afterSave.reconftw.modules.includes('geo')).toBe(!startGeo);
    expect(afterSave.reconftw.modules.includes('waf')).toBe(!startWaf);
    // Modules not touched stay as they were.
    for (const m of original.reconftw.modules.filter((k) => k !== 'geo' && k !== 'waf')) expect(afterSave.reconftw.modules).toContain(m);

    await page.reload();
    await expect(box('Geolocation')).toBeChecked({ checked: !startGeo });
    await expect(box('WAF detection')).toBeChecked({ checked: !startWaf });

    // Group checkbox selects a whole group; unchecking every discovery source shows the warning.
    const discovery = reconCard.getByRole('checkbox', { name: 'Subdomain discovery', exact: true });
    await discovery.check();
    await expect(box('DNS brute-force')).toBeChecked();
    await discovery.uncheck();
    await expect(reconCard.getByText('Select at least one subdomain discovery source')).toBeVisible();

    // Restore the original selection through the UI and save.
    await page.reload();
    await box('Geolocation').setChecked(startGeo);
    await box('WAF detection').setChecked(startWaf);
    await reconCard.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page, 'Reconnaissance settings saved')).toBeVisible();
    const restored = (await api.get<ReconSetting[]>('/scan-tools')).find((t) => t.tool === 'Reconftw')!;
    expect([...restored.reconftw.modules].sort()).toEqual([...original.reconftw.modules].sort());
  });
});
