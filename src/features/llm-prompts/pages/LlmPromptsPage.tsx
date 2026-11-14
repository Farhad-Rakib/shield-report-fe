import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FlaskConical, RotateCcw, Save, ScrollText, XCircle } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { toast } from '../../../components/ui/Toast/toast.store';
import { llmPromptApi } from '../../../core/api/services/llm-prompt.api';
import { LlmPrompt, LlmPromptTestResult } from '../../../domain/models/llm-prompt.model';
import { useAuthStore } from '../../auth/store/auth.store';
import { Permissions } from '../../../core/constants/permissions';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

// Prompt Library: every prompt the app sends to the active LLM provider, editable with
// placeholder insertion, validation, reset-to-default and a live test against sample data.
export const LlmPromptsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission)(Permissions.LlmProviderConfigurationsUpdate);
  const { data: prompts = [], isLoading, error } = useQuery({ queryKey: ['llm-prompts'], queryFn: () => llmPromptApi.getAll() });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [testResult, setTestResult] = useState<LlmPromptTestResult | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected: LlmPrompt | undefined = prompts.find((p) => p.key === selectedKey) ?? prompts[0];

  useEffect(() => {
    if (selected) {
      setSelectedKey(selected.key);
      setDraft(selected.template);
      setTestResult(null);
    }
    // Only when switching prompts or after a save/reset refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key, selected?.template]);

  const dirty = !!selected && draft !== selected.template;
  const missing = useMemo(() => {
    if (!selected) return [] as string[];
    return [...selected.requiredPlaceholders, ...selected.expectedJsonFields].filter((p) => !draft.includes(p));
  }, [selected, draft]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['llm-prompts'] });

  const saveMutation = useMutation({
    mutationFn: () => llmPromptApi.save(selected!.key, draft),
    onSuccess: () => {
      toast.success('Prompt saved. It is used from the next AI call');
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save prompt')),
  });

  const resetMutation = useMutation({
    mutationFn: () => llmPromptApi.reset(selected!.key),
    onSuccess: () => {
      toast.success('Prompt reset to the built-in default');
      setConfirmReset(false);
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to reset prompt')),
  });

  const testMutation = useMutation({
    mutationFn: () => llmPromptApi.test(selected!.key, dirty ? draft : null),
    onSuccess: (result) => setTestResult(result),
    onError: (err: unknown) => toast.error(errorMessage(err, 'Test failed')),
  });

  const insert = (text: string) => {
    const el = textareaRef.current;
    if (!el) {
      setDraft((d) => d + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = draft.slice(0, start) + text + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">AI</p>
          <h1 className="page-title">Prompt Library</h1>
          <p className="page-subtitle">
            The instructions sent to the active AI provider. Edit them to match your house style; placeholders are filled in by the app and the JSON fields it reads back must stay.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, 'Failed to load prompts')}</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
          <div className="space-y-2">
            {prompts.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedKey(p.key)}
                className={`w-full text-left panel p-3 transition-colors ${
                  p.key === selected?.key ? 'ring-2 ring-brand-500 border-transparent' : 'hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                    <ScrollText className="w-4 h-4 text-brand-600 dark:text-brand-400" /> {p.name}
                  </span>
                  {p.isCustomized ? <span className="badge-brand">Customized</span> : <span className="badge-neutral">Default</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4 min-w-0">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">{selected.name}</h2>
                    <p className="panel-subtitle mono">{selected.key}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" disabled={testMutation.isPending} onClick={() => testMutation.mutate()}>
                      <FlaskConical className="w-3.5 h-3.5" /> {testMutation.isPending ? 'Testing…' : dirty ? 'Test draft' : 'Test'}
                    </button>
                    {canEdit && selected.isCustomized && (
                      <button className="btn-secondary btn-sm" onClick={() => setConfirmReset(true)}>
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to default
                      </button>
                    )}
                    {canEdit && (
                      <button className="btn-primary btn-sm" disabled={!dirty || missing.length > 0 || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                        <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="panel-body space-y-3">
                  <div>
                    <p className="label">Placeholders <span className="font-normal text-gray-400">(click to insert)</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.placeholders.map((ph) => (
                        <button
                          key={ph.name}
                          type="button"
                          disabled={!canEdit}
                          title={`${ph.description}\nSample: ${ph.sampleValue}`}
                          onClick={() => insert(ph.name)}
                          className={`code-chip hover:ring-1 hover:ring-brand-400 ${selected.requiredPlaceholders.includes(ph.name) ? 'font-semibold' : ''}`}
                        >
                          {ph.name}
                          {selected.requiredPlaceholders.includes(ph.name) && <span className="text-red-500">*</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    readOnly={!canEdit}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    rows={20}
                    className="input font-mono text-xs leading-relaxed min-h-[420px] h-auto"
                    aria-label="Prompt template"
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{draft.length.toLocaleString()} characters</span>
                    {dirty && <span className="badge-warning">Unsaved changes</span>}
                    {missing.length > 0 ? (
                      <span className="text-red-600 dark:text-red-400">Must contain: {missing.join(', ')}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Required placeholders and JSON fields present</span>
                    )}
                    {dirty && (
                      <button className="text-brand-600 dark:text-brand-400 hover:underline" onClick={() => setDraft(selected.template)}>
                        Discard changes
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The reply must be a JSON object with: {selected.expectedJsonFields.map((f) => <code key={f} className="code-chip mr-1">{f}</code>)}
                  </p>
                </div>
              </div>

              {testResult && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="flex items-center gap-2">
                      {testResult.success && testResult.replyIsValidJson ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <h3 className="panel-title">
                        {testResult.success
                          ? testResult.replyIsValidJson
                            ? 'Reply is valid JSON with every expected field'
                            : 'Reply received, but it is not the expected JSON'
                          : 'Test failed'}
                      </h3>
                    </div>
                    <span className="text-xs text-gray-500">
                      {testResult.providerName ?? 'no provider'} · {(testResult.latencyMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="panel-body grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="label">Prompt sent (sample values)</p>
                      <pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto rounded-md bg-gray-50 dark:bg-gray-950 p-3 font-mono">{testResult.renderedPrompt}</pre>
                    </div>
                    <div>
                      <p className="label">{testResult.success ? 'Reply' : 'Error'}</p>
                      <pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto rounded-md bg-gray-50 dark:bg-gray-950 p-3 font-mono">
                        {testResult.success ? testResult.reply : testResult.error}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => resetMutation.mutate()}
        title="Reset prompt"
        message="Replace your customized prompt with the built-in default? Your version is discarded."
        confirmText="Reset"
        variant="danger"
      />
    </div>
  );
};
