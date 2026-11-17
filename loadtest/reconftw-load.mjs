// Reconftw load test: N parallel full-module reconnaissance scans, to see how the platform and the
// host behave (memory kills, queueing, API latency, scan durations).
//
//   node loadtest/reconftw-load.mjs
//
// Targets (agreed 2026-11-16):
// - LOCAL_SCANS scans of host.docker.internal with EVERY module on. host.docker.internal resolves
//   only inside Docker; .internal is a reserved TLD, so DNS brute-force/permutation lookups die
//   at the public resolvers instead of hitting someone's DNS. Start the local target first:
//     docker run -d --name loadtest-juice-shop -p 3000:3000 bkimminich/juice-shop:v17.1.1
//   Note: port 80 on host.docker.internal is ShieldReport's own Caddy proxy, so web modules
//   probe the app under test as well as Juice Shop (port 3000, found by the uncommon-port probe).
// - REAL_SCANS scan(s) of REAL_TARGET (default demo.testfire.net) with every module EXCEPT DNS
//   brute-force and permutations, so the target's DNS isn't flooded with millions of lookups.
//
// Settings are snapshotted per scan at queue time, so the two module sets are set in turn.
// Everything the test changes (Reconftw settings, scan limits) is restored at the end.

import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const API = process.env.API_URL ?? 'http://127.0.0.1:5050/api/v1';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'superadmin@localhost', password: process.env.ADMIN_PASSWORD ?? 'SuperAdmin@123!' };
const LOCAL_SCANS = Number(process.env.LOCAL_SCANS ?? 9);
const REAL_SCANS = Number(process.env.REAL_SCANS ?? 1);
const REAL_TARGET = process.env.REAL_TARGET ?? 'demo.testfire.net';
const LOCAL_TARGET = process.env.LOCAL_TARGET ?? 'host.docker.internal';
const MEMORY_MB = Number(process.env.MEMORY_MB ?? 512);
const TIMEOUT_MIN = Number(process.env.TIMEOUT_MIN ?? 60);
const CPUS = Number(process.env.CPUS ?? 1);
const REAL_EXCLUDED = ['bruteforce', 'permutations'];
const TOTAL = LOCAL_SCANS + REAL_SCANS;
const RUN = Date.now().toString(36);
const P = `RECON-${RUN}`;
// fileURLToPath decodes %20 etc.; URL.pathname would create a literal 'Selise%20Projects' folder.
const OUT = process.env.OUT_DIR ?? fileURLToPath(new URL(`./results-reconftw/${RUN}/`, import.meta.url));
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const log = (msg) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  appendFileSync(`${OUT}/run.log`, line + '\n');
};

async function call(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text).data : undefined;
}

let token;
async function login() {
  token = (await call(null, 'POST', '/Auth/login', ADMIN)).accessToken;
}
// Access tokens are short-lived; re-login on 401 during the long monitor phase.
async function api(method, path, body) {
  try {
    return await call(token, method, path, body);
  } catch (e) {
    if (e.status !== 401) throw e;
    await login();
    return call(token, method, path, body);
  }
}

async function dockerInfo(names) {
  const { stdout } = await run('docker', ['inspect', '-f', '{{.Name}} restarts={{.RestartCount}} started={{.State.StartedAt}} oom={{.State.OOMKilled}}', ...names]);
  return stdout.trim();
}

// ---------------------------------------------------------------- sampling
const stats = []; // { t, name, cpu, memMiB }
const latency = []; // { t, name, ms, status }
async function sampleDocker() {
  try {
    const { stdout } = await run('docker', ['stats', '--no-stream', '--format', '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}']);
    const t = Date.now();
    for (const line of stdout.trim().split('\n')) {
      const [name, cpu, mem] = line.split('|');
      const used = mem.split('/')[0].trim();
      const n = parseFloat(used);
      const memMiB = used.endsWith('GiB') ? n * 1024 : used.endsWith('MiB') ? n : used.endsWith('KiB') ? n / 1024 : n / 1048576;
      stats.push({ t, name, cpu: parseFloat(cpu), memMiB });
      appendFileSync(`${OUT}/docker-stats.csv`, `${t},${name},${parseFloat(cpu)},${memMiB.toFixed(1)}\n`);
    }
  } catch (e) {
    log(`docker stats failed: ${e.message.slice(0, 120)}`);
  }
}
async function probe(name, path, auth) {
  const started = performance.now();
  let status = 0;
  try {
    const res = await fetch(`${API.replace('/api/v1', '')}${path}`, { headers: auth ? { authorization: `Bearer ${token}` } : {} });
    status = res.status;
    await res.arrayBuffer();
  } catch {
    status = 0;
  }
  const ms = performance.now() - started;
  latency.push({ t: Date.now(), name, ms, status });
  appendFileSync(`${OUT}/latency.csv`, `${Date.now()},${name},${ms.toFixed(0)},${status}\n`);
}

// ---------------------------------------------------------------- main
const created = { orgs: [], assets: [], users: [] };
let leadId;
const engagementFor = {};
let original;
let originalLimits;

async function createAsset(orgId, name, identifier, notes) {
  const a = await api('POST', `/clients/${orgId}/assets`, { clientOrganizationId: orgId, name, assetType: 'WebUrl', identifier, environment: 'Staging', criticality: 'Low' });
  await api('POST', `/assets/${a.id}/scan-authorizations`, { allowedTools: ['Reconftw'], clientContactName: 'Load Test Owner', clientContactEmail: `owner-${RUN}@example.invalid`, notes });
  created.assets.push(a.id);
  return a;
}

async function createEngagement(orgId, label) {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const eng = await api('POST', '/engagements', { clientOrganizationId: orgId, title: `${P} ${label}`, leadPentesterId: leadId, scope: `Reconftw load test (${label})`, startDate: today, endDate: end, testingType: 'Black' });
  engagementFor[orgId] = eng.id;
}

async function setReconftw(modules) {
  await api('PUT', '/scan-tools/Reconftw', {
    ...original,
    isEnabled: true,
    maxParallel: TOTAL,
    memoryMb: MEMORY_MB,
    timeoutMinutes: TIMEOUT_MIN,
    cpus: CPUS,
    reconftw: { modules, threads: original.reconftw.threads },
  });
}

async function restore() {
  log('Restoring Reconftw settings and scan limits');
  try {
    if (original) await api('PUT', '/scan-tools/Reconftw', original);
    if (originalLimits) await api('PUT', '/scan-tools/limits', { maxConcurrentScansPerClient: originalLimits.maxConcurrentScansPerClient, customToolMaxParallel: originalLimits.customToolMaxParallel });
  } catch (e) {
    log(`RESTORE FAILED: ${e.message}`);
  }
  for (const id of created.users) await api('PUT', `/Users/${id}/status`, { isActive: false }).catch(() => {});
  for (const id of created.assets) await api('DELETE', `/assets/${id}`).catch(() => {});
  for (const id of created.orgs) await api('DELETE', `/client-organizations/${id}`).catch(() => {});
}

async function main() {
  await login();
  log(`Run ${P}: ${LOCAL_SCANS} local (${LOCAL_TARGET}, all modules) + ${REAL_SCANS} real (${REAL_TARGET}, no ${REAL_EXCLUDED.join('/')}); ${MEMORY_MB} MB, ${CPUS} CPU, ${TIMEOUT_MIN} min each`);
  log(`Before: ${(await dockerInfo(['shieldreport-mssql', 'shieldreport-api'])).replace(/\n/g, ' | ')}`);
  writeFileSync(`${OUT}/docker-stats.csv`, 't,name,cpu,memMiB\n');
  writeFileSync(`${OUT}/latency.csv`, 't,name,ms,status\n');

  original = (await api('GET', '/scan-tools')).find((s) => s.tool === 'Reconftw');
  originalLimits = await api('GET', '/scan-tools/limits');
  writeFileSync(`${OUT}/original-settings.json`, JSON.stringify({ original, originalLimits }, null, 2));
  const allModules = (await api('GET', '/scan-tools/reconftw/modules')).map((m) => m.key);
  log(`Modules (${allModules.length}): ${allModules.join(', ')}`);

  await api('PUT', '/scan-tools/limits', { maxConcurrentScansPerClient: Math.max(TOTAL, originalLimits.maxConcurrentScansPerClient), customToolMaxParallel: originalLimits.customToolMaxParallel });

  const roles = await api('GET', '/roles');
  const roleList = Array.isArray(roles) ? roles : roles.items ?? roles.data;
  const pentester = roleList.find((r) => /pentester/i.test(r.name));
  const lead = await api('POST', '/Users', { fullName: `${P} Lead`, email: `recon-${RUN}@example.invalid`, password: 'LoadTest@12345!', roleIds: [pentester.id] });
  leadId = lead.id;
  created.users.push(lead.id);

  const localOrg = await api('POST', '/client-organizations', { name: `${P} Local`, primaryContactName: 'Load Contact', primaryContactEmail: `load-${RUN}@example.invalid` });
  created.orgs.push(localOrg.id);
  await createEngagement(localOrg.id, 'Local');
  const localAssets = [];
  for (let i = 0; i < LOCAL_SCANS; i++) {
    localAssets.push(await createAsset(localOrg.id, `${P} Local ${i + 1}`, LOCAL_TARGET, 'Load test: local Juice Shop container (host.docker.internal)'));
  }
  let realAssets = [];
  if (REAL_SCANS > 0) {
    const realOrg = await api('POST', '/client-organizations', { name: `${P} Real`, primaryContactName: 'Load Contact', primaryContactEmail: `load-real-${RUN}@example.invalid` });
    created.orgs.push(realOrg.id);
    await createEngagement(realOrg.id, 'Real');
    for (let i = 0; i < REAL_SCANS; i++) {
      realAssets.push(await createAsset(realOrg.id, `${P} Real ${i + 1}`, REAL_TARGET, `Load test: public demo target ${REAL_TARGET}, approved by the operator; DNS brute-force/permutations off`));
    }
  }

  // Phase A: every module, queued concurrently.
  await setReconftw(allModules);
  const queuedAt = Date.now();
  const scans = [];
  const queueOne = async (asset, kind) => {
    const t0 = performance.now();
    const res = await api('POST', `/assets/${asset.id}/scans`, { tools: ['Reconftw'], engagementId: engagementFor[asset.clientOrganizationId] });
    const list = Array.isArray(res) ? res : res.scans ?? [res];
    for (const s of list) scans.push({ id: s.id, publicId: s.publicId, kind, asset: asset.name, queueMs: performance.now() - t0 });
  };
  await Promise.all(localAssets.map((a) => queueOne(a, 'local-full')));
  // Phase B: same minus DNS brute-force/permutations for the real target.
  if (realAssets.length) {
    await setReconftw(allModules.filter((m) => !REAL_EXCLUDED.includes(m)));
    await Promise.all(realAssets.map((a) => queueOne(a, 'real-no-brute')));
  }
  log(`Queued ${scans.length} scans in ${((Date.now() - queuedAt) / 1000).toFixed(1)}s: ${scans.map((s) => `#${s.id}`).join(' ')}`);

  // Monitor until every scan is terminal (or the scan timeout + 10 min passes).
  const deadline = queuedAt + (TIMEOUT_MIN + 10) * 60_000;
  let last = '';
  let peakRunning = 0;
  const firstRunning = {};
  let detail = [];
  while (Date.now() < deadline) {
    await Promise.all([sampleDocker(), probe('GET /health/ready', '/health/ready', false), probe('GET /api/v1/scans', '/api/v1/scans?pageSize=20', true)]);
    detail = await Promise.all(scans.map((s) => api('GET', `/scans/${s.publicId}`)));
    const running = detail.filter((d) => d.status === 'Running').length;
    peakRunning = Math.max(peakRunning, running);
    for (const d of detail) if (d.status === 'Running' && !firstRunning[d.id]) firstRunning[d.id] = Date.now();
    const counts = detail.reduce((m, d) => ((m[d.status] = (m[d.status] ?? 0) + 1), m), {});
    const reconMem = stats.filter((x) => x.t === stats.at(-1)?.t && x.name.startsWith('shieldreport-scan-')).reduce((a, x) => a + x.memMiB, 0);
    const line = Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ');
    if (line !== last) {
      log(`${line} (scan containers ${reconMem.toFixed(0)} MiB)`);
      last = line;
    }
    if (detail.every((d) => ['Completed', 'Failed', 'Cancelled'].includes(d.status))) break;
    await sleep(10_000);
  }

  log(`After: ${(await dockerInfo(['shieldreport-mssql', 'shieldreport-api'])).replace(/\n/g, ' | ')}`);
  writeFileSync(`${OUT}/scans.json`, JSON.stringify(detail.map((d) => ({ ...d, rawOutput: d.rawOutput?.slice(-4000) })), null, 2));

  // ---------------------------------------------------------------- report
  const rows = detail.map((d) => {
    const meta = scans.find((s) => s.id === d.id);
    const wait = d.startedAt ? (Date.parse(d.startedAt + (d.startedAt.endsWith('Z') ? '' : 'Z')) - queuedAt) / 1000 : null;
    const dur = d.startedAt && d.completedAt ? (Date.parse(d.completedAt + (d.completedAt.endsWith('Z') ? '' : 'Z')) - Date.parse(d.startedAt + (d.startedAt.endsWith('Z') ? '' : 'Z'))) / 1000 : null;
    return { id: d.id, kind: meta.kind, status: d.status, waitS: wait, durS: dur, error: (d.errorMessage ?? '').replace(/\s+/g, ' ').slice(0, 160) };
  });
  const byName = (prefix) => stats.filter((x) => x.name.startsWith(prefix));
  const peak = (arr) => arr.reduce((m, x) => Math.max(m, x.memMiB), 0);
  const ts = [...new Set(stats.map((x) => x.t))];
  const peakScanTotal = ts.reduce((m, t) => Math.max(m, stats.filter((x) => x.t === t && x.name.startsWith('shieldreport-scan-')).reduce((a, x) => a + x.memMiB, 0)), 0);
  const peakAllTotal = ts.reduce((m, t) => Math.max(m, stats.filter((x) => x.t === t).reduce((a, x) => a + x.memMiB, 0)), 0);
  const pct = (arr, p) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1)] : 0);
  const lat = (name) => latency.filter((l) => l.name === name);
  const latRow = (name) => {
    const l = lat(name);
    const ms = l.map((x) => x.ms);
    return `| ${name} | ${l.length} | ${pct(ms, 50).toFixed(0)} | ${pct(ms, 95).toFixed(0)} | ${Math.max(0, ...ms).toFixed(0)} | ${l.filter((x) => x.status >= 400 || x.status === 0).length} |`;
  };

  const md = `# Reconftw load test ${P}

- Started ${new Date(queuedAt).toISOString()}, finished ${now()} (${((Date.now() - queuedAt) / 60000).toFixed(1)} min)
- ${LOCAL_SCANS} × ${LOCAL_TARGET} (all ${allModules.length} modules) + ${REAL_SCANS} × ${REAL_TARGET} (all except ${REAL_EXCLUDED.join(', ')})
- Per scan: ${MEMORY_MB} MB memory (+512 MB swap), ${CPUS} CPU, ${TIMEOUT_MIN} min timeout; Reconftw parallel = ${TOTAL}, per-client cap = ${Math.max(TOTAL, originalLimits.maxConcurrentScansPerClient)}
- Peak scans running at once: **${peakRunning}**

## Scans

| Scan | Kind | Status | Wait to start (s) | Run time (s) | Error |
|---|---|---|---|---|---|
${rows.map((r) => `| #${r.id} | ${r.kind} | ${r.status} | ${r.waitS?.toFixed(0) ?? '-'} | ${r.durS?.toFixed(0) ?? '-'} | ${r.error} |`).join('\n')}

## Memory (MiB)

| What | Peak |
|---|---|
| All containers together | ${peakAllTotal.toFixed(0)} |
| All scan containers together | ${peakScanTotal.toFixed(0)} |
| Largest single scan container | ${peak(byName('shieldreport-scan-')).toFixed(0)} |
| shieldreport-mssql | ${peak(byName('shieldreport-mssql')).toFixed(0)} |
| shieldreport-api | ${peak(byName('shieldreport-api')).toFixed(0)} |
| loadtest-juice-shop | ${peak(byName('loadtest-juice-shop')).toFixed(0)} |

## API latency during the run (ms)

| Probe | Samples | p50 | p95 | max | errors |
|---|---|---|---|---|---|
${latRow('GET /health/ready')}
${latRow('GET /api/v1/scans')}

Raw data: docker-stats.csv, latency.csv, scans.json, run.log.
`;
  writeFileSync(`${OUT}/report.md`, md);
  log(`Report: ${OUT}report.md`);
}

try {
  await main();
} catch (e) {
  log(`ERROR: ${e.stack ?? e.message}`);
  process.exitCode = 1;
} finally {
  await restore();
}
