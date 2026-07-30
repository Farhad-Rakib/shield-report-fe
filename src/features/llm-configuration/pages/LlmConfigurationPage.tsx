import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Power } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { llmConfigurationApi } from '../../../core/api/services/llm-configuration.api';
import { LlmProviderConfiguration } from '../../../domain/models/llm-provider-config.model';
import { CreateLlmProviderConfigurationRequestDto, UpdateLlmProviderConfigurationRequestDto } from '../../../domain/dto/llm-provider-config.dto';

const PROVIDER_OPTIONS = [
  { label: 'OpenRouter', value: 'OpenRouter' },
  { label: 'Gemini', value: 'Gemini' },
  { label: 'OpenAI', value: 'OpenAi' },
];

export const LlmConfigurationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<LlmProviderConfiguration | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: configurations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['llm-provider-configurations'],
    queryFn: () => llmConfigurationApi.getAll(),
  });

  // GET /LlmProviderConfigurations has no server-side pagination — paginate client-side.
  const totalPages = Math.max(1, Math.ceil(configurations.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  const pagedConfigurations = configurations.slice((page - 1) * pageSize, page * pageSize);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['llm-provider-configurations'] });

  const createMutation = useMutation({
    mutationFn: (dto: CreateLlmProviderConfigurationRequestDto) => llmConfigurationApi.create(dto),
    onSuccess: () => {
      invalidate();
      toast.success('LLM provider configuration created successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create configuration'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateLlmProviderConfigurationRequestDto }) => llmConfigurationApi.update(id, dto),
    onSuccess: () => {
      invalidate();
      toast.success('LLM provider configuration updated successfully');
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to update configuration'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => llmConfigurationApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('LLM provider configuration deleted successfully');
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to delete configuration'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => llmConfigurationApi.activate(id),
    onSuccess: () => {
      invalidate();
      toast.success('LLM provider activated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to activate provider'),
  });

  const columns: Column<LlmProviderConfiguration>[] = [
    { key: 'provider', label: 'Provider', sortable: true },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'apiKeyMasked', label: 'API Key' },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            value
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<LlmProviderConfiguration>[] = [
    {
      icon: Power,
      label: 'Activate',
      onClick: (item) => activateMutation.mutate(item.id),
      variant: 'primary',
    },
    { icon: Pencil, label: 'Edit', onClick: (item) => setEditItem(item), variant: 'primary' },
    { icon: Trash2, label: 'Delete', onClick: (item) => setDeleteId(item.id), variant: 'danger' },
  ];

  const createFields: FormField[] = [
    { name: 'provider', label: 'Provider', type: 'select', required: true, options: PROVIDER_OPTIONS },
    { name: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
    { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g. gpt-4o-mini' },
    { name: 'baseUrl', label: 'Base URL (optional)', type: 'text', placeholder: 'Leave blank for provider default' },
    { name: 'temperature', label: 'Temperature', type: 'number', defaultValue: 0.2 },
    { name: 'maxOutputTokens', label: 'Max Output Tokens', type: 'number', defaultValue: 1024 },
    { name: 'promptTemplate', label: 'Prompt Template (optional)', type: 'textarea', rows: 8, placeholder: 'Leave blank to use the default vulnerability-explanation prompt' },
  ];

  const editFields: FormField[] = editItem
    ? [
        { name: 'apiKey', label: 'API Key', type: 'password', placeholder: `Current: ${editItem.apiKeyMasked} — leave blank to keep` },
        { name: 'model', label: 'Model', type: 'text', required: true, defaultValue: editItem.model },
        { name: 'baseUrl', label: 'Base URL (optional)', type: 'text', defaultValue: editItem.baseUrl || '' },
        { name: 'temperature', label: 'Temperature', type: 'number', defaultValue: editItem.temperature },
        { name: 'maxOutputTokens', label: 'Max Output Tokens', type: 'number', defaultValue: editItem.maxOutputTokens },
        { name: 'promptTemplate', label: 'Prompt Template', type: 'textarea', rows: 8, defaultValue: editItem.promptTemplate },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LLM Provider Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure OpenRouter, Gemini, or OpenAI for automated vulnerability explanations and severity suggestions. Only one provider can be active at a time.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={pagedConfigurations}
        isLoading={isLoading}
        error={error?.message}
        emptyState={{ title: 'No LLM providers configured', description: 'Add a provider to enable AI-assisted vulnerability explanations' }}
        actions={{ add: { label: 'Add Provider', onClick: () => setShowAddModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
        pagination={{
          currentPage: page,
          totalPages,
          pageSize,
          total: configurations.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add LLM Provider" size="lg">
        <DynamicForm
          fields={createFields}
          onSubmit={(data) =>
            createMutation.mutate({
              provider: data.provider,
              apiKey: data.apiKey,
              model: data.model,
              baseUrl: data.baseUrl || null,
              temperature: Number(data.temperature),
              maxOutputTokens: Number(data.maxOutputTokens),
              promptTemplate: data.promptTemplate || null,
            })
          }
          submitLabel="Create"
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={editItem !== null} onClose={() => setEditItem(null)} title={`Edit ${editItem?.provider ?? ''} Configuration`} size="lg">
        {editItem && (
          <DynamicForm
            key={editItem.id}
            fields={editFields}
            onSubmit={(data) =>
              updateMutation.mutate({
                id: editItem.id,
                dto: {
                  apiKey: data.apiKey || null,
                  model: data.model,
                  baseUrl: data.baseUrl || null,
                  temperature: Number(data.temperature),
                  maxOutputTokens: Number(data.maxOutputTokens),
                  promptTemplate: data.promptTemplate || null,
                },
              })
            }
            submitLabel="Update"
            onCancel={() => setEditItem(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        title="Delete LLM Provider Configuration"
        message="Are you sure you want to delete this configuration? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
