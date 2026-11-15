import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Power, PowerOff, PlugZap, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { llmConfigurationApi } from '../../../core/api/services/llm-configuration.api';
import { llmProviderCatalogApi } from '../../../core/api/services/llm-provider-catalog.api';
import { LlmProviderCatalogItem } from '../../../domain/models/llm-provider-catalog.model';
import { LlmProvider, LlmProviderConfiguration, LlmProviderTestResult } from '../../../domain/models/llm-provider-config.model';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

interface ProviderInfo {
  label: string;
  modelPlaceholder: string;
  keyPlaceholder: string;
  baseUrl: 'hidden' | 'optional' | 'required';
  baseUrlPlaceholder: string;
  supportsTemperature: boolean;
  hint: string;
}

const PROVIDERS: Record<LlmProvider, ProviderInfo> = {
  Anthropic: {
    label: 'Anthropic (Claude)',
    modelPlaceholder: 'claude-opus-5-5',
    keyPlaceholder: 'sk-ant-...',
    baseUrl: 'optional',
    baseUrlPlaceholder: 'Leave blank for https://api.anthropic.com',
    supportsTemperature: false,
    hint: 'Uses the official Anthropic SDK. Temperature is not sent (current Claude models reject it).',
  },
  OpenAi: {
    label: 'OpenAI',
    modelPlaceholder: 'e.g. gpt-4o-mini',
    keyPlaceholder: 'sk-...',
    baseUrl: 'optional',
    baseUrlPlaceholder: 'Leave blank for https://api.openai.com/v1',
    supportsTemperature: true,
    hint: '',
  },
  Gemini: {
    label: 'Google Gemini',
    modelPlaceholder: 'e.g. gemini-flash-latest',
    keyPlaceholder: 'AIza...',
    baseUrl: 'optional',
    baseUrlPlaceholder: 'Leave blank for the Generative Language API',
    supportsTemperature: true,
    hint: '',
  },
  OpenRouter: {
    label: 'OpenRouter',
    modelPlaceholder: 'e.g. openai/gpt-4o-mini',
    keyPlaceholder: 'sk-or-...',
    baseUrl: 'optional',
    baseUrlPlaceholder: 'Leave blank for https://openrouter.ai/api/v1',
    supportsTemperature: true,
    hint: '',
  },
  OpenAiCompatible: {
    label: 'Other (OpenAI-compatible)',
    modelPlaceholder: 'Model name as the endpoint expects it',
    keyPlaceholder: 'API key / token',
    baseUrl: 'required',
    baseUrlPlaceholder: 'e.g. https://api.groq.com/openai/v1',
    supportsTemperature: true,
    hint: 'Any endpoint that speaks the OpenAI chat-completions format (Groq, Together, Azure proxy, a self-hosted vLLM or Ollama gateway…). The base URL is the part before /chat/completions.',
  },
};

const PROVIDER_ORDER: LlmProvider[] = ['Anthropic', 'OpenAi', 'Gemini', 'OpenRouter', 'OpenAiCompatible'];

/** Which engine a Provider List entry runs on, guessed from its name; anything unknown is OpenAI-compatible. */
const engineFor = (item: LlmProviderCatalogItem): LlmProvider => {
  const n = item.name.toLowerCase();
  if (n.includes('anthropic') || n.includes('claude')) return 'Anthropic';
  if (n.includes('openrouter')) return 'OpenRouter';
  if (n.includes('gemini') || n.includes('google')) return 'Gemini';
  if (n.includes('openai') && !n.includes('compatible')) return 'OpenAi';
  return 'OpenAiCompatible';
};

interface FormState {
  name: string;
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: string;
  maxOutputTokens: string;
  promptTemplate: string;
}

const emptyForm = (): FormState => ({
  name: '',
  provider: 'Anthropic',
  apiKey: '',
  model: '',
  baseUrl: '',
  temperature: '0.2',
  maxOutputTokens: '2048',
  promptTemplate: '',
});

const inputClass = 'input mt-1';

const ProviderFormModal: React.FC<{
  isOpen: boolean;
  editing: LlmProviderConfiguration | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ isOpen, editing, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            name: editing.name,
            provider: editing.provider,
            apiKey: '',
            model: editing.model,
            baseUrl: editing.baseUrl ?? '',
            temperature: String(editing.temperature),
            maxOutputTokens: String(editing.maxOutputTokens),
            promptTemplate: editing.promptTemplate,
          }
        : emptyForm(),
    );
  }, [isOpen, editing]);

  const info = PROVIDERS[form.provider];
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // AI -> Provider List entries, offered as a starting point when adding a configuration.
  const { data: catalog = [] } = useQuery({
    queryKey: ['llm-provider-catalog'],
    queryFn: () => llmProviderCatalogApi.getAll(),
    enabled: isOpen && !editing,
  });
  const applyCatalogItem = (id: string) => {
    const item = catalog.find((c) => String(c.id) === id);
    if (!item) return;
    setForm((f) => ({ ...f, provider: engineFor(item), model: item.model ?? f.model, name: f.name || item.name }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const common = {
        name: form.name.trim() || null,
        model: form.model.trim(),
        baseUrl: form.baseUrl.trim() || null,
        temperature: Number(form.temperature) || 0,
        maxOutputTokens: Number(form.maxOutputTokens) || 1024,
        promptTemplate: null,
      };
      return editing
        ? llmConfigurationApi.update(editing.id, { ...common, apiKey: form.apiKey.trim() || null })
        : llmConfigurationApi.create({ ...common, provider: form.provider, apiKey: form.apiKey.trim() });
    },
    onSuccess: () => {
      toast.success(editing ? 'Provider updated' : 'Provider added. Use Test to check the connection, then Activate it.');
      onSaved();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save provider')),
  });

  const canSave =
    form.model.trim().length > 0 &&
    (editing || form.apiKey.trim().length > 0) &&
    (info.baseUrl !== 'required' || form.baseUrl.trim().length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Edit ${editing.name}` : 'Add LLM Provider'} size="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) saveMutation.mutate();
        }}
      >
        {!editing && catalog.length > 0 && (
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Start from provider list <span className="text-gray-400">(optional)</span>
            <select aria-label="Start from provider list" defaultValue="" onChange={(e) => applyCatalogItem(e.target.value)} className={inputClass}>
              <option value="">Choose a provider to prefill the form…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.model ? ` · ${c.model}` : ''}
                </option>
              ))}
            </select>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              Managed in <Link to="/llm-provider-catalog" className="text-brand-600 dark:text-brand-400 hover:underline">AI → Provider List</Link>.
            </span>
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Provider
            <select
              aria-label="Provider"
              value={form.provider}
              disabled={!!editing}
              onChange={(e) => set('provider', e.target.value as LlmProvider)}
              className={inputClass}
            >
              {PROVIDER_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PROVIDERS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Name <span className="text-gray-400">(optional)</span>
            <input
              value={form.name}
              maxLength={100}
              onChange={(e) => set('name', e.target.value)}
              placeholder={`${info.label} · ${form.model || 'model'}`}
              className={inputClass}
            />
          </label>
        </div>
        {info.hint && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">{info.hint}</p>}

        <label className="block text-sm text-gray-700 dark:text-gray-300">
          API key {!editing && <span className="text-red-500">*</span>}
          <input
            type="password"
            autoComplete="new-password"
            value={form.apiKey}
            onChange={(e) => set('apiKey', e.target.value)}
            placeholder={editing ? `Current: ${editing.apiKeyMasked}. Leave blank to keep it` : info.keyPlaceholder}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Model <span className="text-red-500">*</span>
            <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder={info.modelPlaceholder} className={inputClass} />
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Base URL {info.baseUrl === 'required' ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
            <input value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder={info.baseUrlPlaceholder} className={inputClass} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {info.supportsTemperature && (
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Temperature
              <input type="number" step="0.1" min={0} max={2} value={form.temperature} onChange={(e) => set('temperature', e.target.value)} className={inputClass} />
            </label>
          )}
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Max output tokens
            <input type="number" min={64} max={64000} value={form.maxOutputTokens} onChange={(e) => set('maxOutputTokens', e.target.value)} className={inputClass} />
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          The prompts sent to this provider are managed in <Link to="/llm-prompts" className="text-brand-600 dark:text-brand-400 hover:underline">AI → Prompt Library</Link>.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={!canSave || saveMutation.isPending} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add provider'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const LlmConfigurationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<LlmProviderConfiguration | null>(null);
  const [deleteItem, setDeleteItem] = useState<LlmProviderConfiguration | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, LlmProviderTestResult>>({});

  const { data: configurations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['llm-provider-configurations'],
    queryFn: () => llmConfigurationApi.getAll(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['llm-provider-configurations'] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => llmConfigurationApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Provider deleted');
      setDeleteItem(null);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to delete provider')),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => (active ? llmConfigurationApi.activate(id) : llmConfigurationApi.deactivate(id)),
    onSuccess: (_, { active }) => {
      invalidate();
      toast.success(active ? 'Provider activated' : 'Provider deactivated. AI features are off until one is active');
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to change provider status')),
  });

  const runTest = async (item: LlmProviderConfiguration) => {
    setTestingId(item.id);
    try {
      const result = await llmConfigurationApi.test(item.id);
      setTestResults((r) => ({ ...r, [item.id]: result }));
      if (result.success) toast.success(`${item.name}: connected in ${(result.latencyMs / 1000).toFixed(1)}s`);
      else toast.error(`${item.name}: ${result.error ?? 'connection failed'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Test failed'));
    } finally {
      setTestingId(null);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const active = configurations.find((c) => c.isActive);
  const activeSummary = !isLoading && (
    <div className={`panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm ${active ? '' : 'border-amber-300 dark:border-amber-500/40'}`}>
      <span className="inline-flex items-center gap-2">
        <span className={`status-dot ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {active ? <>Active: <b className="text-gray-900 dark:text-white">{active.name}</b></> : <b className="text-amber-700 dark:text-amber-400">No active provider: AI explanations and report drafting are off</b>}
      </span>
      {active && <span className="text-gray-500 dark:text-gray-400">Model <span className="mono">{active.model}</span> · max {active.maxOutputTokens} output tokens</span>}
      <span className="text-gray-500 dark:text-gray-400">{configurations.length} configured</span>
    </div>
  );

  const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">AI</p>
          <h1 className="page-title">Providers &amp; Models</h1>
          <p className="page-subtitle max-w-3xl">
            AI providers used for vulnerability explanations and for drafting report summaries. Add as many as you like (several models of the same provider too); the active one is used. AI calls always run in the background, so a slow provider never blocks the app.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {activeSummary}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <div className="text-sm text-red-600">
          {(error as Error).message} <button className="underline" onClick={() => refetch()}>Retry</button>
        </div>
      ) : configurations.length === 0 ? (
        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center">
          <p className="font-medium text-gray-900 dark:text-white">No AI provider yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add one to enable AI explanations and report drafting.</p>
          <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {configurations.map((item) => {
            const result = testResults[item.id];
            return (
              <div
                key={item.id}
                className={`panel p-4 ${item.isActive ? 'border-emerald-400 dark:border-emerald-600' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {PROVIDERS[item.provider]?.label ?? item.provider} · <span className="font-mono">{item.model}</span> · key {item.apiKeyMasked}
                      {item.baseUrl && <> · <span className="font-mono">{item.baseUrl}</span></>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      className={`${btn} border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
                      disabled={testingId !== null}
                      onClick={() => runTest(item)}
                    >
                      <PlugZap className="w-3.5 h-3.5" /> {testingId === item.id ? 'Testing…' : 'Test'}
                    </button>
                    {item.isActive ? (
                      <button
                        className={`${btn} border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
                        disabled={activateMutation.isPending}
                        onClick={() => activateMutation.mutate({ id: item.id, active: false })}
                      >
                        <PowerOff className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    ) : (
                      <button
                        className={`${btn} border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`}
                        disabled={activateMutation.isPending}
                        onClick={() => activateMutation.mutate({ id: item.id, active: true })}
                      >
                        <Power className="w-3.5 h-3.5" /> Activate
                      </button>
                    )}
                    <button
                      className={`${btn} border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
                      onClick={() => {
                        setEditItem(item);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      className={`${btn} border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
                      onClick={() => setDeleteItem(item)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
                {result && (
                  <div
                    className={`mt-3 text-xs rounded-md px-3 py-2 flex gap-2 ${
                      result.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}
                  >
                    {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <span className="break-all">
                      {result.success ? `Connected in ${(result.latencyMs / 1000).toFixed(1)}s. Reply: ${result.reply}` : result.error}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProviderFormModal
        isOpen={formOpen}
        editing={editItem}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          invalidate();
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        isOpen={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Delete LLM provider"
        message={`Delete "${deleteItem?.name ?? ''}"? Its API key is removed too. This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
