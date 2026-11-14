import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, RefreshCw, Sparkles } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { reportApi } from '../../../core/api/services/report.api';
import { llmConfigurationApi } from '../../../core/api/services/llm-configuration.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { Permissions } from '../../../core/constants/permissions';
import { Report } from '../../../domain/models/report.model';
import { TestingType, TESTING_TYPE_LABELS } from '../../../domain/models/engagement.model';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const TESTING_TYPES: TestingType[] = ['White', 'Gray', 'Black'];

// Generate Report dialog: pick template, testing type and options, see a live preview of the
// result (nothing is saved until Generate), then generate. AI drafting of the summary sections
// runs in the background after generation, so the button never waits on the LLM.
export const GenerateReportModal: React.FC<{
  isOpen: boolean;
  engagementId: number;
  engagementTestingType: TestingType;
  onClose: () => void;
  onGenerated: (report: Report) => void;
}> = ({ isOpen, engagementId, engagementTestingType, onClose, onGenerated }) => {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [testingType, setTestingType] = useState<TestingType>(engagementTestingType);
  const [showToolNames, setShowToolNames] = useState(false);
  const [draftWithAi, setDraftWithAi] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewSeq = useRef(0);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['report-template-options'],
    queryFn: () => reportApi.templateOptions(),
    enabled: isOpen,
  });

  // Only to tell the user whether AI drafting will happen; needs the LLM-read permission.
  const canSeeLlm = hasPermission(Permissions.LlmProviderConfigurationsRead);
  const { data: providers } = useQuery({
    queryKey: ['llm-provider-configurations'],
    queryFn: () => llmConfigurationApi.getAll(),
    enabled: isOpen && canSeeLlm,
  });
  const activeProvider = providers?.find((p) => p.isActive);

  useEffect(() => {
    if (!isOpen) return;
    setTestingType(engagementTestingType);
    setShowToolNames(false);
    setDraftWithAi(true);
    setPreviewHtml(null);
    setPreviewError(null);
  }, [isOpen, engagementTestingType]);

  useEffect(() => {
    if (isOpen && templateId === null && templates.length > 0) {
      setTemplateId((templates.find((t) => t.isDefault) ?? templates[0]).id);
    }
  }, [isOpen, templates, templateId]);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  const loadPreview = async () => {
    if (!selected) return;
    const seq = ++previewSeq.current;
    if (selected.engine === 'Word') {
      setPreviewHtml(null);
      setPreviewError(`"${selected.name}" is a Word template. It has no live preview: generate the report and download the Word file.`);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const html = await reportApi.previewNew(engagementId, { templateId: selected.id, testingType, showToolNames });
      if (seq === previewSeq.current) setPreviewHtml(html);
    } catch (err) {
      if (seq === previewSeq.current) setPreviewError(errorMessage(err, 'Preview failed'));
    } finally {
      if (seq === previewSeq.current) setPreviewLoading(false);
    }
  };

  // Refresh the preview whenever an option that changes the output changes (debounced).
  useEffect(() => {
    if (!isOpen || !selected) return;
    const handle = window.setTimeout(loadPreview, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, templateId, testingType, showToolNames, selected?.engine]);

  const generateMutation = useMutation({
    mutationFn: () => reportApi.generate(engagementId, { templateId, testingType, showToolNames, draftWithAi }),
    onSuccess: (report) => {
      toast.success(
        report.narrativeStatus === 'Drafting'
          ? 'Report generated. The AI is writing the summary sections in the background'
          : 'Report generated. Fill in the summary sections with Edit Sections',
      );
      onGenerated(report);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to generate report')),
  });

  const label = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
  const select =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal isOpen={isOpen} onClose={() => !generateMutation.isPending && onClose()} title="Generate Report" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <div>
            <span className={label}>Template</span>
            {templatesLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-amber-600">No report template is configured.</p>
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                      t.id === templateId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input type="radio" className="mt-0.5" checked={t.id === templateId} onChange={() => setTemplateId(t.id)} />
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900 dark:text-white truncate">{t.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {t.isDefault && 'Default · '}
                        {t.engine === 'Word' ? 'Word template (no preview)' : t.isCustomHtml ? 'Custom HTML · PDF + Word' : 'Built-in · PDF + Word'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className={label}>Testing type</span>
            <select value={testingType} onChange={(e) => setTestingType(e.target.value as TestingType)} className={select}>
              {TESTING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TESTING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {testingType !== engagementTestingType && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Generating also changes the engagement's testing type.</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" className="mt-0.5" checked={showToolNames} onChange={(e) => setShowToolNames(e.target.checked)} />
            <span>
              Name the scan tools
              <span className="block text-xs text-gray-500 dark:text-gray-400">Off: generic wording, as the client sees in the app.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" className="mt-0.5" checked={draftWithAi} onChange={(e) => setDraftWithAi(e.target.checked)} />
            <span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Draft summaries with AI
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {canSeeLlm && providers
                  ? activeProvider
                    ? `Uses ${activeProvider.name}, in the background after generation.`
                    : 'No AI provider is active, so you write them in Edit Sections.'
                  : 'Executive summary, key findings and recommendations, written in the background after generation.'}
              </span>
            </span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={generateMutation.isPending}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={!selected || generateMutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> {generateMutation.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {generateMutation.isPending && <p className="text-xs text-gray-500 dark:text-gray-400">Building the PDF and Word files. This takes a few seconds.</p>}
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className={label}>Preview {previewLoading && <span className="text-gray-400">(updating…)</span>}</span>
            <button
              onClick={loadPreview}
              disabled={!selected || previewLoading}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="relative flex-1 min-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
            {previewError ? (
              <p className="p-4 text-sm text-amber-700 dark:text-amber-400">{previewError}</p>
            ) : previewHtml ? (
              // sandbox="": no scripts, no same-origin access. The report HTML is display-only here.
              <iframe title="Report preview" sandbox="" srcDoc={previewHtml} className="absolute inset-0 w-full h-full bg-white" />
            ) : (
              <p className="p-4 text-sm text-gray-500">{previewLoading ? 'Rendering preview…' : 'Choose a template to see a preview.'}</p>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Preview of the current findings. Summary sections show placeholder text until they are drafted or written.
          </p>
        </div>
      </div>
    </Modal>
  );
};
