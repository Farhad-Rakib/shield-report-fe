import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Braces, Code2, Eye, Plus, Trash2, Upload } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { reportTemplateApi } from '../../../core/api/services/report-template.api';
import { ReportTemplate, ReportTemplateField, ReportTemplateFieldType } from '../../../domain/models/report-template.model';

// Which built-in a template falls back to: its own testing type, or White in the studio for a
// user-created template (at generation time it follows the engagement's testing type).
const builtInName = (template: ReportTemplate | null) =>
  template?.kind === 'FindingsSummary' ? 'Findings summary' : template?.builtInTestingType ? `${template.builtInTestingType} Box` : 'White Box';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

type Tab = 'html' | 'fields' | 'preview';
const FIELD_TYPES: ReportTemplateFieldType[] = ['text', 'multiline', 'date', 'number'];
const newField = (n: number): ReportTemplateField => ({ key: `field${n}`, label: `Field ${n}`, type: 'text', defaultValue: '', help: '', required: false });

// Template studio: Handlebars HTML (edit or upload), admin-defined dynamic fields
// ({{Custom.key}}, filled per report under Edit Sections) and a sample-data preview of unsaved edits.
export const HtmlTemplateEditorModal: React.FC<{ template: ReportTemplate | null; onClose: () => void; initialTab?: Tab }> = ({ template, onClose, initialTab = 'html' }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [content, setContent] = useState('');
  const [fields, setFields] = useState<ReportTemplateField[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['report-template-html', template?.id],
    queryFn: () => reportTemplateApi.getHtml(template!.id),
    enabled: !!template,
  });
  // Variables differ per kind (engagement report vs findings summary).
  const kind = template?.kind ?? 'Engagement';
  const isFindingsSummary = kind === 'FindingsSummary';
  const { data: variables = [] } = useQuery({ queryKey: ['report-template-variables', kind], queryFn: () => reportTemplateApi.variables(kind), enabled: !!template, staleTime: Infinity });

  useEffect(() => {
    if (data) setContent(data.htmlContent);
  }, [data]);

  // Fields follow the saved template (refreshes after a save); tab/preview reset only on open.
  useEffect(() => {
    if (template) setFields((template.customFields ?? []).map((f) => ({ ...f, defaultValue: f.defaultValue ?? '', help: f.help ?? '' })));
  }, [template]);

  useEffect(() => {
    if (template) {
      setTab(initialTab);
      setPreviewHtml(null);
      setPreviewError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, initialTab]);

  const htmlDirty = !!data && content !== data.htmlContent;
  const savedFields = JSON.stringify((template?.customFields ?? []).map((f) => ({ ...f, defaultValue: f.defaultValue ?? '', help: f.help ?? '' })));
  const fieldsDirty = JSON.stringify(fields) !== savedFields;

  const done = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    queryClient.invalidateQueries({ queryKey: ['report-template-html', template?.id] });
    queryClient.invalidateQueries({ queryKey: ['report-template-options'] });
  };

  const saveHtml = useMutation({
    mutationFn: () => reportTemplateApi.updateHtml(template!.id, content),
    onSuccess: () => done('Template saved. Used for reports generated from now on'),
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save template')),
  });

  const resetHtml = useMutation({
    mutationFn: () => reportTemplateApi.resetHtml(template!.id),
    onSuccess: (result) => {
      setContent(result.htmlContent);
      done(`Template reset to the built-in ${builtInName(template)} template`);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to reset template')),
  });

  const upload = useMutation({
    mutationFn: (file: File) => reportTemplateApi.uploadHtml(template!.id, file),
    onSuccess: (result) => {
      setContent(result.htmlContent);
      done('Template uploaded and validated');
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Upload failed')),
  });

  const saveFields = useMutation({
    mutationFn: () => reportTemplateApi.updateFields(template!.id, fields.map((f) => ({ ...f, defaultValue: f.defaultValue || null, help: f.help || null }))),
    onSuccess: () => done('Dynamic fields saved'),
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save fields')),
  });

  const renderPreview = async () => {
    setPreviewError(null);
    try {
      setPreviewHtml(await reportTemplateApi.preview(template!.id, content, fields.map((f) => ({ ...f, defaultValue: f.defaultValue || null, help: f.help || null }))));
    } catch (err) {
      setPreviewError(errorMessage(err, 'Preview failed'));
    }
  };

  useEffect(() => {
    if (tab === 'preview' && template) void renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const insert = (text: string) => {
    if (tab !== 'html') setTab('html');
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + text);
      return;
    }
    const start = el.selectionStart;
    setContent((c) => c.slice(0, start) + text + c.slice(el.selectionEnd));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const updateField = (i: number, patch: Partial<ReportTemplateField>) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const groups = variables.reduce<Record<string, typeof variables>>((acc, v) => ((acc[v.group] ??= []).push(v), acc), {});
  const tabBtn = (t: Tab, label: string, Icon: typeof Code2, badge?: boolean) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px ${
        tab === t ? 'border-brand-500 text-brand-700 dark:text-brand-300 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
      {badge && <span className="status-dot bg-amber-500" title="Unsaved changes" />}
    </button>
  );

  return (
    <Modal isOpen={!!template} onClose={onClose} title={`Template studio · ${template?.name ?? ''}`} size="xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800">
          <div className="flex">
            {tabBtn('html', 'HTML', Code2, htmlDirty)}
            {tabBtn('fields', `Dynamic fields (${fields.length})`, Braces, fieldsDirty)}
            {tabBtn('preview', 'Preview', Eye)}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 pb-2">
            {data?.isCustom
              ? 'Custom HTML'
              : isFindingsSummary || template?.builtInTestingType
                ? `Built-in ${builtInName(template)} template`
                : "Built-in template (White Box shown; follows the engagement's testing type)"}{' '}
            {isFindingsSummary ? '· used by Export PDF on the Findings Report' : '· one template makes both PDF and Word'}
          </span>
        </div>

        {tab === 'html' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="space-y-2 min-w-0">
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  aria-label="Template HTML"
                  className="input h-[58vh] font-mono text-xs leading-relaxed"
                />
              )}
              <p className="text-2xs text-gray-500 dark:text-gray-400">
                Put user or AI text in with <code className="code-chip">{'{{{text X}}}'}</code> (escaped). Rendering has no network access: use <code className="code-chip">{'{{asset "logo.png"}}'}</code> or data URIs for images.
              </p>
            </div>
            <div className="space-y-3 max-h-[62vh] overflow-auto pr-1">
              <div>
                <p className="label">Your dynamic fields</p>
                {fields.length === 0 ? (
                  <p className="text-xs text-gray-500">None yet. Add them on the Dynamic fields tab.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {fields.map((f) => (
                      // Single-line fields go inline ({{…}} is HTML-escaped). Only multiline ones use
                      // the text helper, which emits block paragraphs: inside a sentence, table cell
                      // or <p> it would break the layout.
                      <button
                        key={f.key}
                        type="button"
                        className="code-chip hover:ring-1 hover:ring-brand-400"
                        title={f.label}
                        onClick={() => insert(f.type === 'multiline' ? `{{{text Custom.${f.key}}}}` : `{{Custom.${f.key}}}`)}
                      >
                        Custom.{f.key}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {Object.entries(groups).map(([group, vars]) => (
                <div key={group}>
                  <p className="label">{group}</p>
                  <ul className="space-y-1">
                    {vars.map((v) => (
                      <li key={v.expression}>
                        <button type="button" className="text-left w-full rounded px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => insert(v.expression)}>
                          <span className="block font-mono text-2xs text-brand-700 dark:text-brand-300 break-all">{v.expression}</span>
                          <span className="block text-2xs text-gray-500 dark:text-gray-400">{v.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'fields' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isFindingsSummary ? (
                <>Fields you define here are asked for in the <b>Export PDF</b> dialog of the Findings Report, and appear in the template as <code className="code-chip">{'{{Custom.key}}'}</code>.</>
              ) : (
                <>Fields you define here appear under <b>Edit Sections</b> on every report made with this template, and in the template as <code className="code-chip">{'{{Custom.key}}'}</code>.</>
              )}{' '}
              The default value is used until someone fills the field in.
            </p>
            {fields.length === 0 && <p className="text-sm text-gray-500">No dynamic fields.</p>}
            {fields.map((f, i) => (
              <div key={i} className="panel p-3 grid grid-cols-1 md:grid-cols-[160px_1fr_130px_auto] gap-3 items-start">
                <label className="block">
                  <span className="label">Key</span>
                  <input className="input font-mono" value={f.key} maxLength={40} onChange={(e) => updateField(i, { key: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })} />
                </label>
                <label className="block">
                  <span className="label">Label</span>
                  <input className="input" value={f.label} maxLength={100} onChange={(e) => updateField(i, { label: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Type</span>
                  <select className="input" value={f.type} onChange={(e) => updateField(i, { type: e.target.value as ReportTemplateFieldType })}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn-ghost btn-sm mt-6" aria-label={`Remove field ${f.key}`} onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
                <label className="block md:col-span-2">
                  <span className="label">Default value</span>
                  {f.type === 'multiline' ? (
                    <textarea className="input h-auto" rows={2} value={f.defaultValue ?? ''} onChange={(e) => updateField(i, { defaultValue: e.target.value })} />
                  ) : (
                    <input className="input" type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} value={f.defaultValue ?? ''} onChange={(e) => updateField(i, { defaultValue: e.target.value })} />
                  )}
                </label>
                <label className="block md:col-span-2">
                  <span className="label">Help text</span>
                  <input className="input" value={f.help ?? ''} onChange={(e) => updateField(i, { help: e.target.value })} />
                </label>
                <label className="inline-flex items-center gap-2 text-xs md:col-span-4">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} /> {isFindingsSummary ? 'Required before export' : 'Required before approval (shown as required in Edit Sections)'}
                </label>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" disabled={fields.length >= 30} onClick={() => setFields((fs) => [...fs, newField(fs.length + 1)])}>
              <Plus className="w-3.5 h-3.5" /> Add field
            </button>
          </div>
        )}

        {tab === 'preview' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sample data with your unsaved HTML and field defaults.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => void renderPreview()}>
                <Eye className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <div className="relative h-[62vh] rounded-md border border-gray-200 dark:border-gray-800 bg-white overflow-hidden">
              {previewError ? (
                <p className="p-4 text-sm text-red-600">{previewError}</p>
              ) : previewHtml ? (
                <iframe title="Template preview" sandbox="" srcDoc={previewHtml} className="absolute inset-0 w-full h-full" />
              ) : (
                <p className="p-4 text-sm text-gray-500">Rendering…</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,.hbs,.handlebars,text/html"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn-secondary btn-sm" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> {upload.isPending ? 'Uploading…' : 'Upload .html / .hbs'}
            </button>
            {data?.isCustom && (
              <button type="button" className="btn-danger btn-sm" disabled={resetHtml.isPending} onClick={() => resetHtml.mutate()}>
                Reset to built-in {builtInName(template)}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {tab === 'fields' ? (
              <button type="button" className="btn-primary" disabled={!fieldsDirty || saveFields.isPending} onClick={() => saveFields.mutate()}>
                {saveFields.isPending ? 'Saving…' : 'Save fields'}
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={!htmlDirty || saveHtml.isPending || !content.trim()} onClick={() => saveHtml.mutate()}>
                {saveHtml.isPending ? 'Validating…' : 'Save HTML'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
