import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/auth.store';
import { Permissions } from '../../../core/constants/permissions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, FlaskConical, Gauge, Lock, RotateCcw, Save, Wrench } from 'lucide-react';
import { toast } from '../../../components/ui/Toast/toast.store';
import { scanToolApi } from '../../../core/api/services/scan-tool.api';
import { ReconftwOptions, ScanQueueLimits, ScanToolSetting, ScanToolTestResult, UpdateScanToolSetting } from '../../../domain/models/scan-tool.model';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm text-gray-700 dark:text-gray-300';
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const toTagList = (value: string) =>
  value.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);

const NumberField: React.FC<{ label: string; value: number; min: number; max: number; step?: number; hint?: string; onChange: (v: number) => void }> = ({ label, value, min, max, step = 1, hint, onChange }) => (
  <label className={labelClass}>
    {label} {hint && <span className="text-gray-400">({hint})</span>}
    <input className={inputClass} type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({ label, checked, onChange, hint }) => (
  <label className="inline-flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
    <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>
      {label}
      {hint && <span className="block text-xs text-gray-400">{hint}</span>}
    </span>
  </label>
);

const SUBDOMAIN_SOURCES = ['passive', 'crt', 'bruteforce', 'scraping', 'analytics'];

// Reconnaissance modules as grouped checkboxes. Only checked modules run; active attack modules
// are never offered (they stay off on the server regardless).
const ReconftwModulesEditor: React.FC<{ value: ReconftwOptions; memoryMb: number; onChange: (v: ReconftwOptions) => void }> = ({ value, memoryMb, onChange }) => {
  const { data: modules = [], isLoading, error } = useQuery({
    queryKey: ['reconftw-modules'],
    queryFn: () => scanToolApi.reconftwModules(),
    staleTime: Infinity,
  });

  const selected = new Set(value.modules);
  const groups = modules.reduce<Record<string, typeof modules>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  const setModules = (keys: string[]) => onChange({ ...value, modules: modules.map((m) => m.key).filter((k) => keys.includes(k)) });
  const toggle = (key: string, on: boolean) => setModules(on ? [...value.modules, key] : value.modules.filter((k) => k !== key));
  const setGroup = (group: string, on: boolean) => {
    const keys = groups[group].map((m) => m.key);
    setModules(on ? [...new Set([...value.modules, ...keys])] : value.modules.filter((k) => !keys.includes(k)));
  };

  const heavyCount = modules.filter((m) => m.heavy && selected.has(m.key)).length;
  const hasSource = value.modules.some((k) => SUBDOMAIN_SOURCES.includes(k));
  const subdomainOnly = modules.length > 0 && value.modules.every((k) => modules.find((m) => m.key === k)?.group === 'Subdomain discovery' || modules.find((m) => m.key === k)?.group === 'Web detection');

  if (isLoading) return <p className="text-sm text-gray-500">Loading modules…</p>;
  if (error) return <p className="text-sm text-red-600">{errorMessage(error, 'Failed to load reconnaissance modules')}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-gray-200">{value.modules.length}</span> of {modules.length} modules selected
          {' · '}
          {subdomainOnly ? 'runs in the light subdomain mode' : 'runs the full recon flow (only the checked modules)'}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setModules(modules.filter((m) => m.defaultSelected).map((m) => m.key))}>
            Reset to recommended
          </button>
          <div className="w-32">
            <NumberField label="Threads" value={value.threads} min={1} max={200} onChange={(v) => onChange({ ...value, threads: v })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(groups).map(([group, items]) => {
          const checkedCount = items.filter((m) => selected.has(m.key)).length;
          return (
            <fieldset key={group} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <legend className="px-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checkedCount === items.length}
                    ref={(el) => {
                      if (el) el.indeterminate = checkedCount > 0 && checkedCount < items.length;
                    }}
                    onChange={(e) => setGroup(group, e.target.checked)}
                  />
                  {group}
                </label>
              </legend>
              <div className="space-y-2">
                {items.map((m) => (
                  <label key={m.key} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" className="mt-0.5" checked={selected.has(m.key)} onChange={(e) => toggle(m.key, e.target.checked)} />
                    <span>
                      {m.label}
                      {m.heavy && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">heavy</span>}
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{m.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {!hasSource && <p className="text-sm text-red-600 dark:text-red-400">Select at least one subdomain discovery source (passive sources, certificate transparency, DNS brute-force, web scraping or analytics IDs).</p>}
      {heavyCount >= 3 && memoryMb < 3072 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {heavyCount} heavy modules with a {memoryMb} MB memory limit: the scan may be killed for running out of memory or hit the timeout. Raise the memory limit and timeout above.
        </p>
      )}
    </div>
  );
};

// One editable card per tool. Changes apply to scans queued after saving; already queued or
// running scans keep the settings they were queued with.
const ToolCard: React.FC<{ setting: ScanToolSetting; maxParallelUpperBound: number; onDirtyChange: (dirty: boolean) => void }> = ({ setting, maxParallelUpperBound, onDirtyChange }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UpdateScanToolSetting>(setting);
  const [includeTags, setIncludeTags] = useState((setting.nuclei?.includeTags ?? []).join(', '));
  const [excludeTags, setExcludeTags] = useState((setting.nuclei?.excludeTags ?? []).join(', '));
  const [testResult, setTestResult] = useState<ScanToolTestResult | null>(null);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(setting) ||
    includeTags !== (setting.nuclei?.includeTags ?? []).join(', ') ||
    excludeTags !== (setting.nuclei?.excludeTags ?? []).join(', ');
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    setDraft(setting);
    setIncludeTags((setting.nuclei?.includeTags ?? []).join(', '));
    setExcludeTags((setting.nuclei?.excludeTags ?? []).join(', '));
  }, [setting]);

  const saveMutation = useMutation({
    mutationFn: () =>
      scanToolApi.update(setting.tool, {
        ...draft,
        nuclei: draft.nuclei ? { ...draft.nuclei, includeTags: toTagList(includeTags), excludeTags: toTagList(excludeTags) } : null,
      }),
    onSuccess: () => {
      toast.success(`${setting.label} settings saved`);
      queryClient.invalidateQueries({ queryKey: ['scan-tool-settings'] });
      queryClient.invalidateQueries({ queryKey: ['scan-tools-available'] });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save settings')),
  });

  const testMutation = useMutation({
    mutationFn: () => scanToolApi.test(setting.tool),
    onSuccess: (result) => setTestResult(result),
    onError: (err: unknown) => toast.error(errorMessage(err, 'Test failed')),
  });

  const set = (patch: Partial<UpdateScanToolSetting>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{setting.label}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Internal tool: {setting.tool} · clients only ever see “{setting.label}”
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={draft.isEnabled} onChange={(e) => set({ isEnabled: e.target.checked })} />
          {draft.isEnabled ? 'Enabled' : 'Disabled — hidden from scan pickers'}
        </label>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-mono break-all">{setting.image}</span>
        <span>· max {setting.pidsLimit} processes (set by deployment)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NumberField label="Timeout (min)" value={draft.timeoutMinutes} min={1} max={1440} onChange={(v) => set({ timeoutMinutes: v })} />
        <NumberField label="Memory (MB)" value={draft.memoryMb} min={128} max={8192} step={128} onChange={(v) => set({ memoryMb: v })} />
        <NumberField label="CPUs" value={draft.cpus} min={0.25} max={4} step={0.25} onChange={(v) => set({ cpus: v })} />
        <NumberField label="Parallel scans" value={draft.maxParallel} min={1} max={maxParallelUpperBound} hint={`1–${maxParallelUpperBound}`} onChange={(v) => set({ maxParallel: v })} />
      </div>

      {draft.naabu && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className={labelClass}>
            Ports
            <select className={inputClass} value={draft.naabu.portPreset} onChange={(e) => set({ naabu: { ...draft.naabu!, portPreset: e.target.value as typeof draft.naabu.portPreset } })}>
              <option value="top-100">Top 100</option>
              <option value="top-1000">Top 1000</option>
              <option value="full">All 65535 (slow)</option>
              <option value="custom">Custom list</option>
            </select>
          </label>
          {draft.naabu.portPreset === 'custom' && (
            <label className={labelClass}>
              Custom ports
              <input className={inputClass} value={draft.naabu.customPorts ?? ''} placeholder="80,443,8000-8100" onChange={(e) => set({ naabu: { ...draft.naabu!, customPorts: e.target.value } })} />
            </label>
          )}
          <NumberField label="Rate" hint="packets/s" value={draft.naabu.rate} min={10} max={10000} onChange={(v) => set({ naabu: { ...draft.naabu!, rate: v } })} />
          <label className={labelClass}>
            Scan type
            <select className={inputClass} value={draft.naabu.scanType} onChange={(e) => set({ naabu: { ...draft.naabu!, scanType: e.target.value as 'connect' | 'syn' } })}>
              <option value="connect">Connect (unprivileged)</option>
              <option value="syn">SYN (faster, runs as root in the container)</option>
            </select>
          </label>
        </div>
      )}

      {draft.nuclei && (
        <div className="space-y-3">
          <div>
            <p className={labelClass}>Severities</p>
            <div className="flex flex-wrap gap-4 mt-1">
              {SEVERITIES.map((sev) => (
                <Toggle
                  key={sev}
                  label={sev}
                  checked={draft.nuclei!.severities.includes(sev)}
                  onChange={(on) =>
                    set({ nuclei: { ...draft.nuclei!, severities: on ? [...draft.nuclei!.severities, sev] : draft.nuclei!.severities.filter((s) => s !== sev) } })
                  }
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className={`${labelClass} md:col-span-2`}>
              Only templates tagged <span className="text-gray-400">(comma-separated, empty = all)</span>
              <input className={inputClass} value={includeTags} placeholder="cve, misconfig" onChange={(e) => setIncludeTags(e.target.value)} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Exclude tags
              <input className={inputClass} value={excludeTags} placeholder="dos, intrusive, fuzz" onChange={(e) => setExcludeTags(e.target.value)} />
            </label>
            <NumberField label="Rate limit" hint="req/s" value={draft.nuclei.rateLimit} min={1} max={1000} onChange={(v) => set({ nuclei: { ...draft.nuclei!, rateLimit: v } })} />
            <NumberField label="Concurrency" value={draft.nuclei.concurrency} min={1} max={100} onChange={(v) => set({ nuclei: { ...draft.nuclei!, concurrency: v } })} />
          </div>
        </div>
      )}

      {draft.reconftw && (
        <ReconftwModulesEditor
          value={draft.reconftw}
          memoryMb={draft.memoryMb}
          onChange={(reconftw) => set({ reconftw })}
        />
      )}

      <div className="flex items-center gap-2 justify-end flex-wrap">
        <button
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <FlaskConical className="w-4 h-4" /> {testMutation.isPending ? 'Testing…' : 'Test'}
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !dirty}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {testResult && (
        <div className={`rounded-lg p-3 text-xs ${testResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <p className={`font-medium mb-1 ${testResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {testResult.success ? 'Tool responded' : 'Test failed'}
          </p>
          <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{testResult.output}</pre>
        </div>
      )}
    </div>
  );
};

// Global limits: how many scans one client can have queued or running at once, and the size of
// the worker pool shared by all custom tools. Per-tool parallelism is set on each tool.
const LimitsCard: React.FC<{ limits: ScanQueueLimits; onDirtyChange: (dirty: boolean) => void }> = ({ limits, onDirtyChange }) => {
  const queryClient = useQueryClient();
  const [perClient, setPerClient] = useState(limits.maxConcurrentScansPerClient);
  const [customParallel, setCustomParallel] = useState(limits.customToolMaxParallel);

  useEffect(() => {
    setPerClient(limits.maxConcurrentScansPerClient);
    setCustomParallel(limits.customToolMaxParallel);
  }, [limits]);

  const dirty = perClient !== limits.maxConcurrentScansPerClient || customParallel !== limits.customToolMaxParallel;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const save = useMutation({
    mutationFn: () => scanToolApi.updateLimits({ maxConcurrentScansPerClient: perClient, customToolMaxParallel: customParallel }),
    onSuccess: (result) => {
      queryClient.setQueryData(['scan-tool-limits'], result);
      toast.success('Scan limits saved');
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save scan limits')),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan limits</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Apply to every tool. Changes take effect within about 15 seconds; no restart needed.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <NumberField
            label="Active scans per client"
            hint={`1–${limits.maxConcurrentScansPerClientUpperBound}`}
            value={perClient}
            min={1}
            max={limits.maxConcurrentScansPerClientUpperBound}
            onChange={setPerClient}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Queued plus running scans one client organization can have at once. Starting more is refused until some finish.</p>
        </div>
        <div>
          <NumberField
            label="Parallel custom-tool scans"
            hint={`1–${limits.maxParallelUpperBound}`}
            value={customParallel}
            min={1}
            max={limits.maxParallelUpperBound}
            onChange={setCustomParallel}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shared by all registered custom tools. Built-in tools have their own "Parallel scans" setting.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

type StatusFilter = 'all' | 'enabled' | 'disabled';
const LIMITS = 'limits';

export const ScanToolsPage: React.FC = () => {
  const { data: settings = [], isLoading, error } = useQuery({ queryKey: ['scan-tool-settings'], queryFn: () => scanToolApi.getAll() });
  const { data: limits } = useQuery({ queryKey: ['scan-tool-limits'], queryFn: () => scanToolApi.getLimits() });
  const canManageCustom = useAuthStore((st) => st.hasPermission)(Permissions.CustomScanToolsManage);

  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dirty, setDirty] = useState(false);

  const visible = settings.filter((s) => status === 'all' || (status === 'enabled' ? s.isEnabled : !s.isEnabled));
  const requested = searchParams.get('tool');
  // Fall back to the first visible tool when the requested one is filtered out or unknown.
  const selected = requested === LIMITS || visible.some((s) => s.tool === requested) ? requested! : visible[0]?.tool ?? LIMITS;
  const selectedSetting = settings.find((s) => s.tool === selected);

  const confirmDiscard = () => !dirty || window.confirm('You have unsaved changes. Discard them?');
  const select = (tool: string) => {
    if (tool === selected || !confirmDiscard()) return;
    setDirty(false);
    setSearchParams((p) => {
      p.set('tool', tool);
      return p;
    }, { replace: true });
  };
  const changeStatus = (next: StatusFilter) => {
    const stillVisible = selected === LIMITS || settings.some((s) => s.tool === selected && (next === 'all' || (next === 'enabled' ? s.isEnabled : !s.isEnabled)));
    if (!stillVisible && !confirmDiscard()) return;
    if (!stillVisible) setDirty(false);
    setStatus(next);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Scanning</p>
          <h1 className="page-title flex items-center gap-2">
            <Wrench className="w-5 h-5" /> Tool Configuration
          </h1>
          <p className="page-subtitle">
            Pick a tool to turn it on or off and tune its limits and options. Changes apply to scans started after saving. Images are pinned by the deployment and can't be changed here.
          </p>
        </div>
        {canManageCustom && (
          <Link to="/custom-tools" className="btn-secondary">
            Custom tools →
          </Link>
        )}
      </div>

      <div className="panel px-3 py-2.5">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 self-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </div>
          <div>
            <label className="label" htmlFor="filter-tool-status">Status</label>
            <select id="filter-tool-status" className="input w-40" value={status} onChange={(e) => changeStatus(e.target.value as StatusFilter)}>
              <option value="all">All tools</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-tool">Tool</label>
            <select id="filter-tool" className="input w-64" value={selected} onChange={(e) => select(e.target.value)}>
              {visible.map((s) => (
                <option key={s.tool} value={s.tool}>
                  {s.label} ({s.tool}){s.isEnabled ? '' : ' · disabled'}
                </option>
              ))}
              <option value={LIMITS}>Scan limits (all tools)</option>
            </select>
          </div>
          {status !== 'all' && (
            <button type="button" className="btn-ghost btn-sm self-end mb-0.5" onClick={() => changeStatus('all')}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <div className="ml-auto self-center text-xs text-gray-500 dark:text-gray-400">
            {settings.filter((s) => s.isEnabled).length} of {settings.length} tools enabled
            {limits && <> · {limits.maxConcurrentScansPerClient} active scans per client</>}
          </div>
        </div>
        {visible.length === 0 && !isLoading && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No {status} tools.</p>}
      </div>

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>}

      {selected === LIMITS ? (
        limits ? (
          <LimitsCard limits={limits} onDirtyChange={setDirty} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2"><Gauge className="w-4 h-4" /> Loading limits…</p>
        )
      ) : (
        selectedSetting && (
          <ToolCard key={selectedSetting.tool} setting={selectedSetting} maxParallelUpperBound={limits?.maxParallelUpperBound ?? 20} onDirtyChange={setDirty} />
        )
      )}
    </div>
  );
};
