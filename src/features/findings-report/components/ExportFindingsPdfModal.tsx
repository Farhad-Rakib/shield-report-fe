import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { findingsReportApi } from '../../../core/api/services/findings-report.api';
import type { GetFindingsReportRequestDto } from '../../../domain/dto/findings-report.dto';
import type { ReportTemplateField } from '../../../domain/models/report-template.model';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const defaultsFor = (fields: ReportTemplateField[]) => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? '']));

// Saves the file under the server's file name.
function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
}

// Export PDF for the Findings Report: choose a Findings summary template (nothing preselected),
// fill in its dynamic fields, and download the current filters' report rendered with it.
export function ExportFindingsPdfModal({
  isOpen,
  onClose,
  filters,
  filterDescription,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: GetFindingsReportRequestDto;
  filterDescription: string;
}) {
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['findings-report-templates'],
    queryFn: () => findingsReportApi.templates(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setTemplateId(null);
    setFieldValues({});
  }, [isOpen]);

  const selected = templates.find((t) => t.id === templateId) ?? null;
  const fields = selected?.customFields ?? [];
  const missing = fields.filter((f) => f.required && !(fieldValues[f.key] ?? '').trim());

  const chooseTemplate = (id: number | null) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setFieldValues(t ? defaultsFor(t.customFields ?? []) : {});
  };

  const exportMutation = useMutation({
    mutationFn: () => findingsReportApi.exportPdf({ templateId: templateId!, filters, customFieldValues: fieldValues }),
    onSuccess: ({ blob, fileName }) => {
      saveBlob(blob, fileName);
      toast.success('Findings report PDF downloaded');
      onClose();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to export the PDF')),
  });

  const label = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
  const input =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal isOpen={isOpen} onClose={() => !exportMutation.isPending && onClose()} title="Export PDF" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
          <span className="font-medium text-gray-700 dark:text-gray-200">Exporting:</span> {filterDescription}
        </div>

        <div>
          <label className={label} htmlFor="fr-export-template">
            Template
          </label>
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No Findings summary template exists. Add one under Reporting → Report Templates.
            </p>
          ) : (
            <select
              id="fr-export-template"
              value={templateId ?? ''}
              onChange={(e) => chooseTemplate(e.target.value ? Number(e.target.value) : null)}
              className={input}
            >
              <option value="">Choose a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && fields.length > 0 && (
          <div className="space-y-3">
            <span className={label}>Report details</span>
            {fields.map((f) => {
              const id = `fr-export-field-${f.key}`;
              const value = fieldValues[f.key] ?? '';
              const set = (v: string) => setFieldValues((prev) => ({ ...prev, [f.key]: v }));
              const cls = `${input} ${f.required && !value.trim() ? 'border-amber-400 dark:border-amber-500' : ''}`;
              return (
                <div key={f.key}>
                  <label htmlFor={id} className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                    {f.label} {f.required && <span className="text-red-500 dark:text-red-400">*</span>}
                  </label>
                  {f.type === 'multiline' ? (
                    <textarea id={id} rows={3} value={value} onChange={(e) => set(e.target.value)} className={cls} />
                  ) : (
                    <input
                      id={id}
                      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className={cls}
                    />
                  )}
                  {f.help && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{f.help}</p>}
                </div>
              );
            })}
          </div>
        )}

        {selected && missing.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Fill in the required fields: {missing.map((f) => f.label).join(', ')}.</p>
        )}
        {exportMutation.isPending && <p className="text-xs text-gray-500 dark:text-gray-400">Building the PDF. This takes a few seconds.</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={exportMutation.isPending}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={!selected || missing.length > 0 || isLoading || exportMutation.isPending}
            title={!selected ? 'Choose a template first' : missing.length > 0 ? `Fill in: ${missing.map((f) => f.label).join(', ')}` : undefined}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" /> {exportMutation.isPending ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
