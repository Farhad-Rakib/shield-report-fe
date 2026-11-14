import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, FlaskConical, Pencil, Plus, Puzzle, Terminal, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { toast } from '../../../components/ui/Toast/toast.store';
import { customScanToolApi } from '../../../core/api/services/custom-scan-tool.api';
import { CustomScanTool, CustomToolOutputFormat, CustomToolSeverity, SaveCustomScanTool } from '../../../domain/models/custom-scan-tool.model';
import { ScanToolTestResult } from '../../../domain/models/scan-tool.model';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const PLACEHOLDERS = [
  { name: '{target}', hint: 'The asset identifier as registered (URL, host or IP)' },
  { name: '{host}', hint: 'Host name only (scheme and path removed)' },
  { name: '{url}', hint: 'Full URL (https:// added for bare hosts)' },
  { name: '{port}', hint: 'Port of {url}' },
];

const OUTPUT_FORMATS: { value: CustomToolOutputFormat; label: string; hint: string }[] = [
  { value: 'lines', label: 'One finding per line', hint: 'Every non-empty stdout line becomes a finding at the default severity.' },
  { value: 'nuclei-jsonl', label: 'Nuclei JSON lines', hint: 'The tool prints Nuclei-compatible JSONL (many ProjectDiscovery tools support -json).' },
  { value: 'raw', label: 'Output only', hint: 'No findings are created; the output is kept on the scan.' },
];

const SEVERITIES: CustomToolSeverity[] = ['Informational', 'Low', 'Medium', 'High', 'Critical'];

const EXAMPLE: SaveCustomScanTool = {
  name: 'httpx',
  clientLabel: 'Web Service Discovery',
  description: 'Probes the target for live web services and technologies.',
  image: 'projectdiscovery/httpx:latest',
  arguments: ['-u', '{url}', '-silent', '-title', '-tech-detect', '-status-code'],
  outputFormat: 'lines',
  defaultSeverity: 'Informational',
  timeoutMinutes: 10,
  memoryMb: 512,
  cpus: 1,
  runAsRoot: false,
  isEnabled: true,
};

const empty = (): SaveCustomScanTool => ({ ...EXAMPLE, name: '', clientLabel: '', description: '', image: '', arguments: ['{target}'] });

const ToolFormModal: React.FC<{ isOpen: boolean; editing: CustomScanTool | null; onClose: () => void; onSaved: () => void }> = ({ isOpen, editing, onClose, onSaved }) => {
  const [form, setForm] = useState<SaveCustomScanTool>(empty());
  const [argsText, setArgsText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const initial = editing ? { ...editing, description: editing.description ?? '' } : empty();
    setForm(initial);
    setArgsText(initial.arguments.join('\n'));
  }, [isOpen, editing]);

  const set = <K extends keyof SaveCustomScanTool>(key: K, value: SaveCustomScanTool[K]) => setForm((f) => ({ ...f, [key]: value }));
  const args = argsText.split('\n').map((a) => a.trim()).filter((a) => a.length > 0);
  const hasTarget = args.some((a) => ['{target}', '{host}', '{url}'].some((p) => a.includes(p)));
  const command = `docker run --rm${form.runAsRoot ? '' : ' --user 1000:1000'} --memory ${form.memoryMb}m --cpus ${form.cpus} --security-opt no-new-privileges ${form.image || '<image>'} ${args
    .map((a) => (/\s/.test(a) ? `"${a}"` : a))
    .join(' ')}`;

  const save = useMutation({
    mutationFn: () => {
      const dto = { ...form, arguments: args, description: form.description?.trim() || null };
      return editing ? customScanToolApi.update(editing.id, dto) : customScanToolApi.create(dto);
    },
    onSuccess: () => {
      toast.success(editing ? 'Tool updated' : 'Tool added. Press Test to pull the image before the first scan');
      onSaved();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save tool')),
  });

  const canSave = form.name.trim() && form.clientLabel.trim() && form.image.trim() && hasTarget;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Edit ${editing.name}` : 'Add custom tool'} size="xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) save.mutate();
        }}
      >
        {!editing && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-brand-50 dark:bg-brand-500/10 px-3 py-2 text-xs text-brand-800 dark:text-brand-300">
            <span>Any Docker image that takes the target on its command line works. Start from an example?</span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setForm(EXAMPLE);
                setArgsText(EXAMPLE.arguments.join('\n'));
              }}
            >
              Fill httpx example
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Name (staff only) *</span>
            <input className="input" value={form.name} maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder="e.g. httpx" />
          </label>
          <label className="block">
            <span className="label">Client label *</span>
            <input className="input" value={form.clientLabel} maxLength={100} onChange={(e) => set('clientLabel', e.target.value)} placeholder="e.g. Web Service Discovery" />
            <span className="text-2xs text-gray-500">Clients and reports see this, never the real tool name.</span>
          </label>
        </div>

        <label className="block">
          <span className="label">Description</span>
          <input className="input" value={form.description ?? ''} maxLength={1000} onChange={(e) => set('description', e.target.value)} />
        </label>

        <label className="block">
          <span className="label">Docker image *</span>
          <input className="input font-mono" value={form.image} onChange={(e) => set('image', e.target.value.trim())} placeholder="projectdiscovery/httpx:latest or ghcr.io/org/tool@sha256:…" />
          <span className="text-2xs text-gray-500">Pin a tag or digest for repeatable results.</span>
        </label>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <label className="block">
            <span className="label">Arguments * <span className="font-normal text-gray-400">(one per line, passed as-is: no shell)</span></span>
            <textarea className="input font-mono text-xs h-auto" rows={7} value={argsText} onChange={(e) => setArgsText(e.target.value)} spellCheck={false} />
            {!hasTarget && <span className="text-2xs text-red-600">At least one argument must contain {'{target}'}, {'{host}'} or {'{url}'}.</span>}
          </label>
          <div>
            <span className="label">Placeholders</span>
            <ul className="space-y-1.5">
              {PLACEHOLDERS.map((p) => (
                <li key={p.name} className="text-xs">
                  <button type="button" className="code-chip hover:ring-1 hover:ring-brand-400" onClick={() => setArgsText((t) => (t.endsWith('\n') || t === '' ? t : t + '\n') + p.name)}>
                    {p.name}
                  </button>
                  <span className="ml-1.5 text-gray-500 dark:text-gray-400">{p.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <span className="label inline-flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> Command preview</span>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded-md bg-console text-emerald-300 p-3">{command}</pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Output</span>
            <select className="input" value={form.outputFormat} onChange={(e) => set('outputFormat', e.target.value as CustomToolOutputFormat)}>
              {OUTPUT_FORMATS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="text-2xs text-gray-500">{OUTPUT_FORMATS.find((o) => o.value === form.outputFormat)?.hint}</span>
          </label>
          <label className="block">
            <span className="label">Default severity</span>
            <select className="input" value={form.defaultSeverity} disabled={form.outputFormat !== 'lines'} onChange={(e) => set('defaultSeverity', e.target.value as CustomToolSeverity)}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="label">Timeout (min)</span>
            <input className="input" type="number" min={1} max={1440} value={form.timeoutMinutes} onChange={(e) => set('timeoutMinutes', Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="label">Memory (MB)</span>
            <input className="input" type="number" min={128} max={8192} step={128} value={form.memoryMb} onChange={(e) => set('memoryMb', Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="label">CPUs</span>
            <input className="input" type="number" min={0.25} max={4} step={0.25} value={form.cpus} onChange={(e) => set('cpus', Number(e.target.value))} />
          </label>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isEnabled} onChange={(e) => set('isEnabled', e.target.checked)} /> Enabled (shown in the scan tool picker)
          </label>
          <label className="inline-flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.runAsRoot} onChange={(e) => set('runAsRoot', e.target.checked)} />
            <span>
              Run as root inside the container
              <span className="block text-2xs text-amber-600 dark:text-amber-400">Only if the image refuses to start otherwise. Default is UID 1000.</span>
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!canSave || save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add tool'}</button>
        </div>
      </form>
    </Modal>
  );
};

// Scanning → Custom Tools: register any Docker-packaged scanner. SuperAdmin only.
export const CustomToolsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: tools = [], isLoading, error } = useQuery({ queryKey: ['custom-scan-tools'], queryFn: () => customScanToolApi.getAll() });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomScanTool | null>(null);
  const [deleting, setDeleting] = useState<CustomScanTool | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, ScanToolTestResult>>({});

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-scan-tools'] });
    queryClient.invalidateQueries({ queryKey: ['scan-tools-available'] });
  };

  const del = useMutation({
    mutationFn: (id: number) => customScanToolApi.remove(id),
    onSuccess: () => {
      toast.success('Tool deleted');
      setDeleting(null);
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to delete tool')),
  });

  const test = async (tool: CustomScanTool) => {
    setTesting(tool.id);
    try {
      const r = await customScanToolApi.test(tool.id);
      setResults((x) => ({ ...x, [tool.id]: r }));
      if (r.success) toast.success(`${tool.name}: image ready`);
      else toast.error(`${tool.name}: ${r.output}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Test failed'));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Scanning</p>
          <h1 className="page-title">Custom Tools</h1>
          <p className="page-subtitle">
            Add any Docker-packaged scanner. It runs like the built-in tools: in its own container with memory, CPU and process limits, no host access, after the built-in steps of a scan chain.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add tool
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Only add images you trust: they run on this server's Docker host. Scans with custom tools need a scan authorization that allows <b>Custom Check</b>.
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, 'Failed to load tools')}</p>
      ) : tools.length === 0 ? (
        <div className="panel p-10 text-center">
          <Puzzle className="w-8 h-8 mx-auto text-gray-400" />
          <p className="mt-2 font-medium text-gray-900 dark:text-white">No custom tools yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Register a scanner image and it appears in the scan tool picker.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tools.map((t) => {
            const r = results[t.id];
            return (
              <div key={t.id} className="panel">
                <div className="panel-header">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <h3 className="panel-title truncate">{t.name}</h3>
                      {t.isEnabled ? <span className="badge-success">Enabled</span> : <span className="badge-neutral">Disabled</span>}
                      {t.runAsRoot && <span className="badge-warning">root</span>}
                    </div>
                    <p className="panel-subtitle">Client label: {t.clientLabel}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="btn-secondary btn-sm" disabled={testing !== null} onClick={() => test(t)}>
                      <FlaskConical className="w-3.5 h-3.5" /> {testing === t.id ? 'Pulling…' : 'Test'}
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn-danger btn-sm" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="panel-body space-y-2 text-xs">
                  {t.description && <p className="text-gray-600 dark:text-gray-400">{t.description}</p>}
                  <p className="font-mono break-all text-gray-800 dark:text-gray-200">
                    {t.image} {t.arguments.join(' ')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {OUTPUT_FORMATS.find((o) => o.value === t.outputFormat)?.label}
                    {t.outputFormat === 'lines' && ` · ${t.defaultSeverity}`} · {t.timeoutMinutes} min · {t.memoryMb} MB · {t.cpus} CPU
                  </p>
                  {r && <p className={r.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{r.output}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToolFormModal
        isOpen={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refresh();
        }}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id)}
        title="Delete custom tool"
        message={`Delete "${deleting?.name ?? ''}"? Past scans keep their results; it disappears from the tool picker.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
