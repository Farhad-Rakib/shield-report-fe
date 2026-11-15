import fs from 'node:fs';
import { Api, ClientAsset, ClientOrg, CustomTool, Engagement, LlmPrompt, LlmProvider, Paged, Report, ReportTemplate, Vulnerability } from './support/api';
import { SNAPSHOT_FILE, SettingsSnapshot } from './support/snapshot';

const isE2E = (name: string | null | undefined) => !!name && name.startsWith('E2E-');

// Removes everything the suite created (all `E2E-` records; nothing else ever has that prefix)
// and restores the global settings captured in global setup. Engagements and scans have no delete
// endpoint, and client organizations/assets are only deactivated by the API: those are listed in
// e2e-results/leftovers.json.
export default async function globalTeardown() {
  const api = await Api.login();
  const leftovers: string[] = [];
  const errors: string[] = [];
  const attempt = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
    }
  };

  // ---- Restore global settings ----
  if (fs.existsSync(SNAPSHOT_FILE)) {
    const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')) as SettingsSnapshot;
    let restored = true;

    const providers = await api.get<LlmProvider[]>('/LlmProviderConfigurations');
    const active = providers.find((p) => p.isActive);
    if (snap.activeProviderId && active?.id !== snap.activeProviderId) {
      await attempt('re-activate original LLM provider', () => api.post(`/LlmProviderConfigurations/${snap.activeProviderId}/activate`));
    } else if (!snap.activeProviderId && active) {
      await attempt('deactivate provider', () => api.post(`/LlmProviderConfigurations/${active.id}/deactivate`));
    }

    const prompts = await api.get<LlmPrompt[]>('/llm-prompts');
    for (const original of snap.prompts) {
      const current = prompts.find((p) => p.key === original.key);
      if (!current || (current.template === original.template && current.isCustomized === original.isCustomized)) continue;
      await attempt(`restore prompt ${original.key}`, () =>
        original.isCustomized ? api.put(`/llm-prompts/${original.key}`, { template: original.template }) : api.post(`/llm-prompts/${original.key}/reset`),
      );
    }

    for (const original of snap.scanTools) {
      await attempt(`restore scan tool ${original.tool}`, () => api.put(`/scan-tools/${original.tool}`, original));
    }

    if (errors.length === 0) fs.rmSync(SNAPSHOT_FILE);
    else restored = false;
    if (!restored) leftovers.push(`Settings snapshot kept at ${SNAPSHOT_FILE} (restore failed)`);
  }

  // ---- Delete created records ----
  const providers = await api.get<LlmProvider[]>('/LlmProviderConfigurations');
  for (const p of providers.filter((x) => isE2E(x.name) && !x.isActive)) {
    await attempt(`delete provider ${p.name}`, () => api.delete(`/LlmProviderConfigurations/${p.id}`));
  }

  const orgs = (await api.get<Paged<ClientOrg>>('/client-organizations?pageSize=100')).data.filter((o) => isE2E(o.name));
  for (const org of orgs) {
    const engagements = (await api.get<Paged<Engagement>>(`/engagements?clientOrganizationId=${org.id}&pageSize=100`)).data;
    for (const e of engagements) {
      const reports = await api.get<Report[]>(`/engagements/${e.id}/reports`);
      for (const r of reports) await attempt(`delete report ${r.id}`, () => api.delete(`/reports/${r.id}`));
      leftovers.push(`engagement #${e.id} "${e.title}" (no delete endpoint; its scans stay too)`);
    }
    const vulns = (await api.get<Paged<Vulnerability>>(`/vulnerabilities?clientOrganizationId=${org.id}&pageSize=100`)).data;
    for (const v of vulns) await attempt(`delete vulnerability ${v.id}`, () => api.delete(`/vulnerabilities/${v.id}`));
    const assets = (await api.get<Paged<ClientAsset>>(`/clients/${org.id}/assets?pageSize=100`)).data;
    for (const a of assets) {
      await attempt(`deactivate asset ${a.id}`, () => api.delete(`/assets/${a.id}`));
    }
    await attempt(`deactivate org ${org.id}`, () => api.delete(`/client-organizations/${org.id}`));
    leftovers.push(`client organization #${org.id} "${org.name}" and its assets (API only deactivates)`);
  }

  const templates = await api.get<ReportTemplate[]>('/ReportTemplates');
  for (const t of templates.filter((x) => isE2E(x.name))) {
    await attempt(`delete template ${t.name}`, () => api.delete(`/ReportTemplates/${t.id}`));
  }

  const tools = await api.get<CustomTool[]>('/custom-scan-tools');
  for (const t of tools.filter((x) => isE2E(x.name))) {
    await attempt(`delete custom tool ${t.name}`, () => api.delete(`/custom-scan-tools/${t.id}`));
  }

  await api.dispose();
  fs.mkdirSync('e2e-results', { recursive: true });
  fs.writeFileSync('e2e-results/leftovers.json', JSON.stringify({ leftovers, errors }, null, 2));
  if (errors.length) console.warn(`[teardown] cleanup errors:\n  ${errors.join('\n  ')}`);
}
