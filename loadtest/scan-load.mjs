// Load test: N concurrent users browse the app while queueing M harmless scans each, then
// exercise report generation (dynamic sections + custom fields) and findings PDF export under
// concurrency. Scans use an alpine custom tool that sleeps and echoes: it never contacts the
// target (assets are *.example.invalid).
//
//   node loadtest/scan-load.mjs            # 25 users x 4 scans
//   USERS=10 SCANS_PER_USER=2 node loadtest/scan-load.mjs
//
// Talks to the API's localhost debug port, like the E2E suite. Everything it creates is named
// LOAD-<run>; cleanup deletes what the API allows and deactivates the rest.

const API = process.env.API_URL ?? 'http://127.0.0.1:5050/api/v1';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'superadmin@localhost', password: process.env.ADMIN_PASSWORD ?? 'SuperAdmin@123!' };
const USERS = Number(process.env.USERS ?? 25);
const SCANS_PER_USER = Number(process.env.SCANS_PER_USER ?? 4);
const ASSETS = Number(process.env.ASSETS ?? 5);
const SCAN_TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT_MS ?? 30 * 60_000);
const EXPORTS = Math.min(10, USERS);
const RUN = Date.now().toString(36);
const P = `LOAD-${RUN}`;
const PASSWORD = 'LoadTest@12345!';

// ---------------------------------------------------------------- metrics
const samples = []; // { name, ms, status }
const failures = [];
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

async function call(token, method, path, body, { name, raw = false, expect } = {}) {
  const started = performance.now();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    samples.push({ name: name ?? `${method} ${path}`, ms: performance.now() - started, status: 0 });
    failures.push(`${method} ${path} -> network error ${e.message}`);
    throw e;
  }
  const buf = raw ? Buffer.from(await res.arrayBuffer()) : null;
  const text = raw ? '' : await res.text();
  const ms = performance.now() - started;
  samples.push({ name: name ?? `${method} ${path.replace(/\d+|[0-9a-f-]{36}/g, ':id').split('?')[0]}`, ms, status: res.status });
  const ok = expect ? res.status === expect : res.ok;
  if (!ok) {
    const msg = `${method} ${path} -> ${res.status} ${text.slice(0, 300)}`;
    failures.push(msg);
    const err = new Error(msg);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  if (raw) return { buf, headers: res.headers };
  return text ? JSON.parse(text).data : undefined;
}

async function login(email, password) {
  const d = await call(null, 'POST', '/Auth/login', { email, password }, { name: 'POST /Auth/login' });
  return d.accessToken;
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

// ---------------------------------------------------------------- setup
const ctx = { users: [], assets: [], scans: [], reports: [], templates: [] };

async function setup(admin) {
  console.log(`\n== Setup (${P})`);
  const tool = await call(admin, 'POST', '/custom-scan-tools', {
    name: `${P}-echo`, clientLabel: `Load Echo ${RUN}`, description: 'Load test: sleeps then echoes, contacts nothing',
    image: 'alpine:3.20', arguments: ['sh', '-c', 'echo "checking {host}"; sleep 3; echo "found {host}"'],
    outputFormat: 'lines', defaultSeverity: 'Low', timeoutMinutes: 5, memoryMb: 128, cpus: 0.5, runAsRoot: false, isEnabled: true,
  });
  ctx.toolId = tool.id;

  const org = await call(admin, 'POST', '/client-organizations', { name: `${P} Org`, primaryContactName: 'Load Contact', primaryContactEmail: `load-${RUN}@example.invalid` });
  ctx.orgId = org.id;

  for (let i = 0; i < ASSETS; i++) {
    const a = await call(admin, 'POST', `/clients/${org.id}/assets`, {
      clientOrganizationId: org.id, name: `${P} App ${i + 1}`, assetType: 'WebUrl', identifier: `load-${RUN}-${i + 1}.example.invalid`, environment: 'Staging', criticality: 'Medium',
    });
    await call(admin, 'POST', `/assets/${a.id}/scan-authorizations`, { allowedTools: ['Custom'], clientContactName: 'Load Approver', clientContactEmail: `approver-${RUN}@example.invalid`, notes: 'Load test: harmless echo tool only' });
    ctx.assets.push(a);
  }

  const roles = await call(admin, 'GET', '/roles');
  const roleList = Array.isArray(roles) ? roles : roles.items ?? roles.data;
  const pentester = roleList.find((r) => /pentester/i.test(r.name));
  for (let i = 0; i < USERS; i++) {
    const u = await call(admin, 'POST', '/Users', { fullName: `${P} Tester ${i + 1}`, email: `load-${RUN}-${i + 1}@example.invalid`, password: PASSWORD, roleIds: [pentester.id] });
    ctx.users.push({ id: u.id, email: `load-${RUN}-${i + 1}@example.invalid` });
  }

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const eng = await call(admin, 'POST', '/engagements', {
    clientOrganizationId: org.id, title: `${P} Pentest`, leadPentesterId: ctx.users[0].id, scope: 'Load test (no real traffic)', startDate: today, endDate: end, testingType: 'Gray',
  });
  ctx.engagementId = eng.id;
  for (const u of ctx.users.slice(1)) await call(admin, 'POST', `/engagements/${eng.id}/assignees`, { userId: u.id });
  console.log(`  tool #${tool.id}, org #${org.id}, ${ASSETS} assets, ${USERS} pentesters, engagement #${eng.id}`);
}

// ---------------------------------------------------------------- load phase
async function virtualUser(i, stop) {
  const u = ctx.users[i];
  u.token = await login(u.email, PASSWORD);
  const t = u.token;
  const asset = ctx.assets[i % ctx.assets.length];
  const pages = [
    () => call(t, 'GET', '/Dashboard', undefined, { name: 'GET /Dashboard' }),
    () => call(t, 'GET', '/menu', undefined, { name: 'GET /menu' }),
    () => call(t, 'GET', '/engagements?pageSize=20', undefined, { name: 'GET /engagements' }),
    () => call(t, 'GET', `/engagements/${ctx.engagementId}`, undefined, { name: 'GET /engagements/:id' }),
    () => call(t, 'GET', `/scans?engagementId=${ctx.engagementId}&pageSize=20`, undefined, { name: 'GET /scans' }),
    () => call(t, 'GET', `/vulnerabilities?engagementId=${ctx.engagementId}&pageSize=20`, undefined, { name: 'GET /vulnerabilities' }),
    () => call(t, 'GET', `/findings-report?engagementId=${ctx.engagementId}`, undefined, { name: 'GET /findings-report' }),
    () => call(t, 'GET', `/clients/${ctx.orgId}/assets?pageSize=20`, undefined, { name: 'GET /clients/:id/assets' }),
  ];
  const browse = (async () => {
    while (!stop.done) {
      await pages[Math.floor(Math.random() * pages.length)]().catch(() => {});
      await sleep(rand(1000, 3000));
    }
  })();

  const submit = (async () => {
  // The API caps active (queued + running) scans per client; over the cap it answers 409 and the
  // user tries again later. Model that: back off and retry until the scan is accepted.
  for (let s = 0; s < SCANS_PER_USER; s++) {
    await sleep(rand(0, 4000));
    for (;;) {
      try {
        const created = await call(t, 'POST', `/assets/${asset.id}/scans`, { tools: ['Custom'], engagementId: ctx.engagementId, customToolIds: [ctx.toolId] }, { name: 'POST /assets/:id/scans', expect: 201 });
        ctx.scans.push(...created.map((c) => c.publicId));
        break;
      } catch (e) {
        if (e.status !== 409) { ctx.scanErrors = (ctx.scanErrors ?? 0) + 1; break; }
        failures.pop();
        ctx.capRejections = (ctx.capRejections ?? 0) + 1;
        if (Date.now() - stop.startedAt > SCAN_TIMEOUT_MS) break;
        await sleep(rand(2000, 6000));
      }
    }
  }
  ctx.usersDone = (ctx.usersDone ?? 0) + 1;
  })();
  return { browse, submit };
}

async function monitorScans(admin, startedAt) {
  const expected = USERS * SCANS_PER_USER;
  let last = '';
  for (;;) {
    const page = await call(admin, 'GET', `/scans?engagementId=${ctx.engagementId}&pageSize=100`, undefined, { name: 'monitor' });
    const items = page.data ?? page.items ?? [];
    const counts = items.reduce((m, s) => ((m[s.status] = (m[s.status] ?? 0) + 1), m), {});
    const line = Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ');
    if (line !== last) {
      console.log(`  [${((Date.now() - startedAt) / 1000).toFixed(0)}s] ${line}`);
      last = line;
    }
    const terminal = items.filter((s) => ['Completed', 'Failed', 'Cancelled'].includes(s.status)).length;
    const allSubmitted = ctx.usersDone === USERS;
    if (allSubmitted && items.length >= ctx.scans.length && terminal === items.length) return items;
    if (Date.now() - startedAt > SCAN_TIMEOUT_MS) return items;
    await sleep(3000);
  }
}

// ---------------------------------------------------------------- reports
async function reportPhase(admin) {
  console.log('\n== Reports: dynamic sections and custom fields');
  const lead = ctx.users[0].token;
  const engPath = `/engagements/${ctx.engagementId}`;
  const options = await call(lead, 'GET', '/reports/template-options');
  const optList = Array.isArray(options) ? options : options.templates ?? [];
  const builtIns = optList.filter((o) => /Selise Standard/.test(o.name));
  check('template options list the 3 built-in testing-type templates', builtIns.length === 3, builtIns.map((b) => b.name).join(' | '));

  // Each built-in: preview, generate, edit sections, check the HTML, download PDF.
  for (const tpl of builtIns) {
    const type = /White/.test(tpl.name) ? 'White' : /Gray/.test(tpl.name) ? 'Gray' : 'Black';
    const preview = await call(lead, 'POST', `${engPath}/reports/preview`, { templateId: tpl.id, testingType: type }, { name: 'POST report preview (new)' });
    check(`${type} Box preview renders`, typeof preview === 'string' && preview.length > 1000, `${preview.length} chars`);
    const report = await call(lead, 'POST', `${engPath}/reports`, { templateId: tpl.id, testingType: type, draftWithAi: false }, { name: 'POST generate report', expect: 201 });
    ctx.reports.push(report.id);
    const goals = `Load goals ${type} ${RUN}`;
    const limits = `Load limitations ${type} ${RUN}`;
    await call(lead, 'PATCH', `/reports/${report.id}/narrative`, { executiveSummary: `Exec ${type} ${RUN}`, keyFindings: `Findings ${type} ${RUN}`, keyRecommendations: `Recs ${type} ${RUN}` }, { name: 'PATCH report narrative' });
    await call(lead, 'PATCH', `/reports/${report.id}/sections`, { projectGoals: goals, limitations: limits, showToolNames: false }, { name: 'PATCH report sections' });
    await call(lead, 'POST', `/reports/${report.id}/regenerate`, undefined, { name: 'POST regenerate report' });
    const html = await call(lead, 'GET', `/reports/${report.id}/preview`, undefined, { name: 'GET report preview' });
    // The Black Box template (like its SELISE sample) has no Project Goals section.
    const goalsOk = type === 'Black' ? true : html.includes(goals);
    check(`${type} Box: edited sections appear in the rendered report`,
      goalsOk && html.includes(limits) && html.includes(`Exec ${type} ${RUN}`),
      `goals=${html.includes(goals)} limits=${html.includes(limits)} exec=${html.includes(`Exec ${type} ${RUN}`)}`);
    check(`${type} Box: real tool name hidden from client report`, !/naabu|nuclei|reconftw/i.test(html));
    const pdf = await call(lead, 'GET', `/reports/${report.id}/download-pdf`, undefined, { name: 'GET report pdf', raw: true });
    check(`${type} Box: PDF downloads`, pdf.buf.subarray(0, 4).toString() === '%PDF', `${(pdf.buf.length / 1024).toFixed(0)} KB`);
  }

  // Custom template with required + optional dynamic fields.
  const t = await call(admin, 'POST', '/ReportTemplates', { name: `${P}-custom-fields`, companyDisplayName: 'Load Security Ltd' });
  ctx.templates.push(t.id);
  await call(admin, 'PUT', `/ReportTemplates/${t.id}/fields`, {
    fields: [
      { key: 'signoff', label: 'Sign-off', type: 'text', defaultValue: null, help: 'Approver', required: true },
      { key: 'ticket', label: 'Ticket', type: 'text', defaultValue: 'TCK-DEFAULT', help: null, required: false },
    ],
  });
  const base = await call(admin, 'GET', `/ReportTemplates/${t.id}/html`);
  await call(admin, 'PUT', `/ReportTemplates/${t.id}/html`, {
    htmlContent: base.htmlContent.replace(/(<body[^>]*>)/i, '$1<p class="load-custom">Signed: {{Custom.signoff}} / Ticket: {{Custom.ticket}}</p>'),
  });
  let missingStatus = 0;
  try {
    await call(lead, 'POST', `${engPath}/reports`, { templateId: t.id, draftWithAi: false }, { name: 'POST generate report (missing field)' });
  } catch (e) { missingStatus = e.status; failures.pop(); }
  check('generate without a required dynamic field is rejected', missingStatus === 400, `HTTP ${missingStatus}`);
  const xss = '<script>alert(1)</script>';
  const r2 = await call(lead, 'POST', `${engPath}/reports`, { templateId: t.id, draftWithAi: false, customFieldValues: { signoff: `Lead ${RUN} ${xss}` } }, { name: 'POST generate report', expect: 201 });
  ctx.reports.push(r2.id);
  let html = await call(lead, 'GET', `/reports/${r2.id}/preview`);
  check('custom field value and default render', html.includes(`Signed: Lead ${RUN}`) && html.includes('Ticket: TCK-DEFAULT'));
  check('custom field value is HTML-escaped', !html.includes(xss) && html.includes('&lt;script&gt;'));
  await call(lead, 'PATCH', `/reports/${r2.id}/sections`, { projectGoals: 'Goals', limitations: 'Limits', showToolNames: false, customFieldValues: { signoff: `Edited ${RUN}`, ticket: 'TCK-42' } });
  await call(lead, 'POST', `/reports/${r2.id}/regenerate`, undefined, { name: 'POST regenerate report' });
  html = await call(lead, 'GET', `/reports/${r2.id}/preview`);
  check('custom fields can be edited after generation', html.includes(`Signed: Edited ${RUN}`) && html.includes('Ticket: TCK-42'));

  // Concurrency: every user generates a report at once.
  console.log(`\n== Reports: ${USERS} concurrent generations`);
  const tpl = builtIns[0];
  const t0 = performance.now();
  const results = await Promise.allSettled(ctx.users.map((u) =>
    call(u.token, 'POST', `${engPath}/reports`, { templateId: tpl.id, draftWithAi: false }, { name: 'POST generate report (concurrent)', expect: 201 })));
  const ok = results.filter((r) => r.status === 'fulfilled');
  ok.forEach((r) => ctx.reports.push(r.value.id));
  const versions = new Set(ok.map((r) => r.value.version));
  check(`${USERS} concurrent report generations succeed`, ok.length === USERS, `${ok.length}/${USERS} in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  check('concurrent generations get distinct version numbers', versions.size === ok.length, `${versions.size} distinct of ${ok.length}`);
  const tl = performance.now();
  const list = await call(lead, 'GET', `${engPath}/reports`, undefined, { name: 'GET engagement reports (30 reports)' });
  check('report list stays fast with many reports', performance.now() - tl < 1500, `${list.length} reports in ${(performance.now() - tl).toFixed(0)} ms`);

  // Findings summary export (temporary template).
  console.log('\n== Findings Report PDF export');
  const fs = await call(admin, 'POST', '/ReportTemplates', { name: `${P}-findings-summary`, companyDisplayName: 'Load Security Ltd', kind: 'FindingsSummary' });
  ctx.templates.push(fs.id);
  const summary = await call(lead, 'GET', `/findings-report?engagementId=${ctx.engagementId}`);
  check('findings report scoped to the engagement', JSON.stringify(summary).includes(`${P} Org`));
  const exports = await Promise.allSettled(ctx.users.slice(0, EXPORTS).map((u) =>
    call(u.token, 'POST', '/findings-report/export-pdf', { templateId: fs.id, filters: { engagementId: ctx.engagementId } }, { name: 'POST findings export-pdf (concurrent)', raw: true })));
  const pdfs = exports.filter((r) => r.status === 'fulfilled' && r.value.buf.subarray(0, 4).toString() === '%PDF');
  check(`${EXPORTS} concurrent findings PDF exports succeed`, pdfs.length === EXPORTS, `${pdfs.length}/${EXPORTS}`);
}

// ---------------------------------------------------------------- isolation
async function isolationChecks(admin) {
  console.log('\n== Data scoping');
  // An outsider pentester (not assigned) must not see the engagement.
  const roles = await call(admin, 'GET', '/roles');
  const pentester = (Array.isArray(roles) ? roles : roles.items ?? roles.data).find((r) => /pentester/i.test(r.name));
  const email = `load-${RUN}-outsider@example.invalid`;
  const u = await call(admin, 'POST', '/Users', { fullName: `${P} Outsider`, email, password: PASSWORD, roleIds: [pentester.id] });
  ctx.users.push({ id: u.id, email, outsider: true });
  const t = await login(email, PASSWORD);
  const list = await call(t, 'GET', '/engagements?pageSize=100');
  check('unassigned pentester does not see the engagement', !(list.data ?? []).some((e) => e.id === ctx.engagementId));
  let status = 0;
  try { await call(t, 'GET', `/engagements/${ctx.engagementId}`); } catch (e) { status = e.status; failures.pop(); }
  check('unassigned pentester gets 404 on the engagement', status === 404, `HTTP ${status}`);
  let scanStatus = 0;
  try { await call(t, 'POST', `/assets/${ctx.assets[0].id}/scans`, { tools: ['Custom'], engagementId: ctx.engagementId, customToolIds: [ctx.toolId] }); } catch (e) { scanStatus = e.status; failures.pop(); }
  check('unassigned pentester cannot scan in the engagement', scanStatus === 403 || scanStatus === 404, `HTTP ${scanStatus}`);
}

// ---------------------------------------------------------------- cleanup
async function cleanup(admin) {
  console.log('\n== Cleanup');
  const errs = [];
  const tryDo = async (label, fn) => { try { await fn(); } catch (e) { errs.push(`${label}: ${e.message.slice(0, 160)}`); } };
  for (const id of ctx.reports) await tryDo(`report ${id}`, () => call(admin, 'DELETE', `/reports/${id}`));
  for (const id of ctx.templates) await tryDo(`template ${id}`, () => call(admin, 'DELETE', `/ReportTemplates/${id}`));
  if (ctx.orgId) {
    const vulns = await call(admin, 'GET', `/vulnerabilities?clientOrganizationId=${ctx.orgId}&pageSize=100`).catch(() => ({ data: [] }));
    for (const v of vulns.data ?? []) await tryDo(`vuln ${v.id}`, () => call(admin, 'DELETE', `/vulnerabilities/${v.id}`));
    for (const a of ctx.assets) await tryDo(`asset ${a.id}`, () => call(admin, 'DELETE', `/assets/${a.id}`));
    await tryDo('org', () => call(admin, 'DELETE', `/client-organizations/${ctx.orgId}`));
  }
  for (const u of ctx.users) await tryDo(`user ${u.id}`, () => call(admin, 'PUT', `/Users/${u.id}/status`, { isActive: false }));
  if (ctx.toolId) await tryDo('tool', () => call(admin, 'DELETE', `/custom-scan-tools/${ctx.toolId}`));
  console.log(errs.length ? `  cleanup errors:\n    ${errs.join('\n    ')}` : '  done (users deactivated; org/assets deactivated; engagement and scans kept: no delete API)');
}

// ---------------------------------------------------------------- main
const admin = await login(ADMIN.email, ADMIN.password);
const runStart = Date.now();
try {
  await setup(admin);

  console.log(`\n== Load: ${USERS} concurrent users, ${USERS * SCANS_PER_USER} scans`);
  const loadStart = Date.now();
  const stop = { done: false, startedAt: loadStart };
  const sampleStart = samples.length;
  // virtualUser resolves after login; its scan submissions continue in the background.
  const browsers = await Promise.all(ctx.users.map((_, i) => virtualUser(i, stop)));
  const scans = await monitorScans(admin, loadStart);
  console.log(`  ${ctx.scans.length} scans accepted; ${ctx.capRejections ?? 0} attempts were told to retry (per-client cap)`);
  stop.done = true;
  await Promise.all(browsers.map((b) => b.browse));
  const drainS = (Date.now() - loadStart) / 1000;

  const done = scans.filter((s) => s.status === 'Completed');
  const waits = done.filter((s) => s.startedAt).map((s) => (new Date(s.startedAt) - new Date(s.queuedAt)) / 1000);
  const runs = done.filter((s) => s.startedAt && s.completedAt).map((s) => (new Date(s.completedAt) - new Date(s.startedAt)) / 1000);
  check(`${USERS * SCANS_PER_USER} scans queued`, ctx.scans.length === USERS * SCANS_PER_USER, `${ctx.scans.length}`);
  check('all scans completed', done.length === USERS * SCANS_PER_USER, `${done.length} completed, ${scans.length - done.length} other`);
  console.log(`  queue drained in ${drainS.toFixed(0)}s; wait p50 ${pct(waits, 50).toFixed(0)}s / max ${Math.max(0, ...waits).toFixed(0)}s; run p50 ${pct(runs, 50).toFixed(1)}s / max ${Math.max(0, ...runs).toFixed(1)}s`);
  const loadSamples = samples.slice(sampleStart).filter((s) => s.name !== 'monitor');
  const errors5xx = loadSamples.filter((s) => s.status >= 500 || s.status === 0).length;
  const errors429 = loadSamples.filter((s) => s.status === 429).length;
  check('no 5xx/network errors during load', errors5xx === 0, `${errors5xx} of ${loadSamples.length} requests`);
  check('no rate-limit rejections during load', errors429 === 0, `${errors429}`);
  ctx.loadSamples = loadSamples;
  ctx.drainS = drainS;

  const vulns = await call(admin, 'GET', `/vulnerabilities?engagementId=${ctx.engagementId}&pageSize=100`);
  const vulnCount = vulns.total ?? vulns.data?.length ?? 0;
  check('scan findings became vulnerabilities', vulnCount > 0, `${vulnCount} for ${ASSETS} assets / ${done.length} scans`);
  ctx.vulnCount = vulnCount;

  await reportPhase(admin);
  await isolationChecks(admin);
} catch (e) {
  console.error(`\nABORTED: ${e.stack ?? e}`);
  checks.push({ name: 'run completed', ok: false, detail: e.message });
} finally {
  await cleanup(admin);
}

// ---------------------------------------------------------------- summary
console.log('\n== Endpoint latency during load (ms)');
const by = {};
for (const s of ctx.loadSamples ?? []) (by[s.name] ??= []).push(s);
console.log('  endpoint'.padEnd(40) + 'n'.padStart(6) + 'p50'.padStart(8) + 'p95'.padStart(8) + 'max'.padStart(8) + '  non-2xx');
for (const [name, list] of Object.entries(by).sort()) {
  const ms = list.map((s) => s.ms);
  const bad = list.filter((s) => s.status < 200 || s.status >= 300).length;
  console.log(`  ${name.padEnd(38)}${String(list.length).padStart(6)}${pct(ms, 50).toFixed(0).padStart(8)}${pct(ms, 95).toFixed(0).padStart(8)}${Math.max(...ms).toFixed(0).padStart(8)}  ${bad}`);
}
const rep = {};
for (const s of samples.filter((x) => /report|export/i.test(x.name))) (rep[s.name] ??= []).push(s.ms);
console.log('\n== Report endpoints (ms)');
for (const [name, ms] of Object.entries(rep).sort()) console.log(`  ${name.padEnd(38)}${String(ms.length).padStart(6)}${pct(ms, 50).toFixed(0).padStart(8)}${pct(ms, 95).toFixed(0).padStart(8)}${Math.max(...ms).toFixed(0).padStart(8)}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n== ${checks.length - failed.length}/${checks.length} checks passed in ${((Date.now() - runStart) / 1000).toFixed(0)}s`);
if (failures.length) console.log(`  unexpected HTTP failures (${failures.length}), first 10:\n    ${failures.slice(0, 10).join('\n    ')}`);
process.exit(failed.length ? 1 : 0);
