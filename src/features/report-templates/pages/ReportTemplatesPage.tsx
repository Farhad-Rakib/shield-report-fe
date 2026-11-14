import { HtmlTemplateEditorModal } from '../components/HtmlTemplateEditorModal';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Upload, FileX, FileText, Star, Code, Braces } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { reportTemplateApi } from '../../../core/api/services/report-template.api';
import { ReportTemplate } from '../../../domain/models/report-template.model';

const TOKEN_GROUPS: { label: string; tokens: string[] }[] = [
  { label: 'Simple (anywhere, incl. table cells)', tokens: ['{{ClientName}}', '{{CompanyDisplayName}}', '{{ReportVersion}}', '{{EngagementDateRange}}', '{{TotalFindingsCount}}', '{{SeverityBreakdown}}', '{{GeneratedDate}}'] },
  { label: 'Multi-line (must be alone in its own paragraph)', tokens: ['{{ExecutiveSummary}}'] },
  { label: 'Repeating bullet list (alone in its own paragraph)', tokens: ['{{KeyFindingsList}}', '{{KeyRecommendationsList}}'] },
  { label: 'Repeating table row (put in any cell of one row)', tokens: ['{{Finding.Title}}', '{{Finding.Severity}}', '{{Finding.PatchStatus}}', '{{Finding.Endpoint}}', '{{Finding.AssetName}}'] },
  { label: 'Repeating detailed-findings block (between {{DetailedFindingsStart}} and {{DetailedFindingsEnd}} paragraphs)', tokens: ['{{Finding.Id}}', '{{Finding.CvssScore}}', '{{Finding.AffectedSystem}}', '{{Finding.ToolsUsed}}', '{{Finding.References}}', '{{Finding.Description}}', '{{Finding.Impact}}', '{{Finding.Recommendation}}', '{{Finding.ProofOfConcept}}', '{{Finding.StepsToReproduce}}'] },
];

export const ReportTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<ReportTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadItem, setUploadItem] = useState<ReportTemplate | null>(null);
  const [clearItem, setClearItem] = useState<ReportTemplate | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportTemplateApi.getAll(),
  });

  // GET /ReportTemplates has no server-side pagination — paginate client-side over the full list.
  const totalPages = Math.max(1, Math.ceil(templates.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  const pagedTemplates = templates.slice((page - 1) * pageSize, page * pageSize);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['report-templates'] });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; companyDisplayName: string }) => reportTemplateApi.create(dto),
    onSuccess: () => {
      invalidate();
      toast.success('Report template created successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create report template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { name: string; companyDisplayName: string } }) => reportTemplateApi.update(id, dto),
    onSuccess: () => {
      invalidate();
      toast.success('Report template updated successfully');
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to update report template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reportTemplateApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Report template deleted successfully');
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to delete report template'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => reportTemplateApi.uploadDocxTemplate(id, file),
    onSuccess: () => {
      invalidate();
      toast.success('Template document uploaded — reports from this template now use it');
      setUploadItem(null);
      setSelectedFile(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to upload template document'),
  });

  const clearMutation = useMutation({
    mutationFn: (id: number) => reportTemplateApi.clearDocxTemplate(id),
    onSuccess: () => {
      invalidate();
      toast.success('Custom template removed — this template now falls back to the default document');
      setClearItem(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to remove custom template'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => reportTemplateApi.setDefault(id),
    onSuccess: () => {
      invalidate();
      toast.success('Default report template updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to set default template'),
  });

  const [htmlItem, setHtmlItem] = useState<ReportTemplate | null>(null);
  const [studioTab, setStudioTab] = useState<'html' | 'fields' | 'preview'>('html');

  const columns: Column<ReportTemplate>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'companyDisplayName', label: 'Company Display Name' },
    { key: 'isDefault', label: 'Default', render: (value: boolean) => (value ? <span className="badge-brand">Default</span> : <span className="text-xs text-gray-400">—</span>) },
    {
      key: 'customFields',
      label: 'Dynamic fields',
      render: (_, item) =>
        item.customFields && item.customFields.length > 0 ? (
          <span className="font-mono text-2xs text-gray-600 dark:text-gray-400">{item.customFields.map((f) => f.key).join(', ')}</span>
        ) : (
          <span className="text-xs text-gray-400">none</span>
        ),
    },
    {
      key: 'hasCustomDocxTemplate',
      label: 'Template Document',
      render: (_, item) =>
        item.hasCustomDocxTemplate ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <FileText className="w-3.5 h-3.5" /> {item.docxTemplateFileName}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">HTML engine{item.hasCustomHtmlTemplate ? ' — custom template' : ' — built-in template'}</span>
        ),
    },
  ];

  const rowActions: RowAction<ReportTemplate>[] = [
    { icon: Star, label: 'Set as Default', onClick: (item) => setDefaultMutation.mutate(item.id), variant: 'success', show: (item) => !item.isDefault },
    { icon: Code, label: 'Template studio: HTML, upload, preview', onClick: (item) => { setStudioTab('html'); setHtmlItem(item); }, variant: 'primary' },
    { icon: Braces, label: 'Dynamic fields', onClick: (item) => { setStudioTab('fields'); setHtmlItem(item); }, variant: 'primary' },
    { icon: Upload, label: 'Upload Word Document (legacy engine)', onClick: (item) => setUploadItem(item), variant: 'secondary' },
    { icon: FileX, label: 'Remove Custom Template', onClick: (item) => setClearItem(item), variant: 'danger', show: (item) => item.hasCustomDocxTemplate },
    { icon: Pencil, label: 'Edit', onClick: (item) => setEditItem(item), variant: 'primary' },
    { icon: Trash2, label: 'Delete', onClick: (item) => setDeleteId(item.id), variant: 'danger' },
  ];

  const createFields: FormField[] = [
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. White Box Testing — Client Standard' },
    { name: 'companyDisplayName', label: 'Company Display Name', type: 'text', required: true },
  ];

  const editFields: FormField[] = [
    { name: 'name', label: 'Name', type: 'text', required: true, defaultValue: editItem?.name || '' },
    { name: 'companyDisplayName', label: 'Company Display Name', type: 'text', required: true, defaultValue: editItem?.companyDisplayName || '' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Reporting</p>
          <h1 className="page-title">Report Templates</h1>
          <p className="page-subtitle">
            Each template is Handlebars HTML that becomes both the PDF and the Word file. Open the template studio to edit or upload HTML, define dynamic fields filled per report, and preview with sample data. Uploading a Word document instead switches that template to the legacy engine (Word only, no preview).
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pagedTemplates}
        isLoading={isLoading}
        error={error?.message}
        emptyState={{ title: 'No report templates found', description: 'Create a template to get started' }}
        actions={{ add: { label: 'Add Template', onClick: () => setShowAddModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
        pagination={{
          currentPage: page,
          totalPages,
          pageSize,
          total: templates.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Report Template" size="md">
        <DynamicForm
          fields={createFields}
          onSubmit={(data) => createMutation.mutate({ name: data.name, companyDisplayName: data.companyDisplayName })}
          submitLabel="Create"
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={editItem !== null} onClose={() => setEditItem(null)} title="Edit Report Template" size="md">
        {editItem && (
          <DynamicForm
            key={editItem.id}
            fields={editFields}
            onSubmit={(data) => updateMutation.mutate({ id: editItem.id, dto: { name: data.name, companyDisplayName: data.companyDisplayName } })}
            submitLabel="Update"
            onCancel={() => setEditItem(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        isOpen={uploadItem !== null}
        onClose={() => { setUploadItem(null); setSelectedFile(null); }}
        title={`Upload Template Document — ${uploadItem?.name ?? ''}`}
        size="lg"
      >
        {uploadItem && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a .docx file for this template. Reports generated from this template will fill{' '}
              <strong>this document</strong> instead of the default one — write any of the placeholders below
              into the document as plain text and they'll be replaced when a report is generated.
            </p>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
              {TOKEN_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tokens.map((token) => (
                      <code key={token} className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                        {token}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => { setUploadItem(null); setSelectedFile(null); }}
                disabled={uploadMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile || uploadMutation.isPending}
                onClick={() => selectedFile && uploadMutation.mutate({ id: uploadItem.id, file: selectedFile })}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        title="Delete Report Template"
        message="Are you sure you want to delete this report template? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={clearItem !== null}
        onClose={() => setClearItem(null)}
        onConfirm={() => clearItem !== null && clearMutation.mutate(clearItem.id)}
        title="Remove Custom Template"
        message="This template will fall back to the default document for any future reports. The uploaded file will be deleted."
        confirmText="Remove"
        variant="danger"
      />
      <HtmlTemplateEditorModal template={htmlItem ? templates.find((t) => t.id === htmlItem.id) ?? htmlItem : null} initialTab={studioTab} onClose={() => setHtmlItem(null)} />
    </div>
  );
};
