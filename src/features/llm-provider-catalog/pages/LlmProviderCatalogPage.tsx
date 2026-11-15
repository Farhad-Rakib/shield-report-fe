import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal/Modal';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { Loader } from '../../../components/ui/Loader/Loader';
import { toast } from '../../../components/ui/Toast/toast.store';
import { llmProviderCatalogApi } from '../../../core/api/services/llm-provider-catalog.api';
import { Permissions } from '../../../core/constants/permissions';
import { LlmProviderCatalogItem } from '../../../domain/models/llm-provider-catalog.model';
import { useAuthStore } from '../../auth/store/auth.store';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const QUERY_KEY = ['llm-provider-catalog'];

const ProviderModal: React.FC<{
  isOpen: boolean;
  editing: LlmProviderCatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ isOpen, editing, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(editing?.name ?? '');
    setModel(editing?.model ?? '');
  }, [isOpen, editing]);

  const save = useMutation({
    mutationFn: () => {
      const dto = { name: name.trim(), model: model.trim() || null };
      return editing ? llmProviderCatalogApi.update(editing.id, dto) : llmProviderCatalogApi.create(dto);
    },
    onSuccess: () => {
      toast.success(editing ? 'Provider saved' : 'Provider added');
      onSaved();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save provider')),
  });

  const canSave = name.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Edit ${editing.name}` : 'Add provider'} size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) save.mutate();
        }}
      >
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Name <span className="text-red-500">*</span>
          <input
            autoFocus
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anthropic"
            className="input mt-1"
          />
        </label>
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Model <span className="text-gray-400">(optional)</span>
          <input
            value={model}
            maxLength={200}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. claude-opus-5-5"
            className="input mt-1"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={!canSave || save.isPending} className="btn-primary">
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add provider'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export function LlmProviderCatalogPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(Permissions.LlmProviderConfigurationsCreate);
  const canUpdate = hasPermission(Permissions.LlmProviderConfigurationsUpdate);
  const canDelete = hasPermission(Permissions.LlmProviderConfigurationsDelete);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LlmProviderCatalogItem | null>(null);
  const [deleting, setDeleting] = useState<LlmProviderCatalogItem | null>(null);

  const { data: items = [], isLoading, error } = useQuery({ queryKey: QUERY_KEY, queryFn: () => llmProviderCatalogApi.getAll() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const remove = useMutation({
    mutationFn: (id: number) => llmProviderCatalogApi.remove(id),
    onSuccess: () => {
      toast.success('Provider deleted');
      invalidate();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to delete provider')),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Provider List</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            LLM providers offered when adding a configuration in{' '}
            <Link to="/llm-providers" className="text-brand-600 dark:text-brand-400 hover:underline">AI → Providers &amp; Models</Link>.
            The model is optional and prefills that form.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add provider
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="py-10"><Loader text="Loading providers…" /></div>
        ) : error ? (
          <p className="p-4 text-sm text-red-600 dark:text-red-400">{errorMessage(error, 'Failed to load providers')}</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="No providers yet"
            description="Add the LLM providers your team uses, optionally with a default model."
            action={canCreate ? { label: 'Add provider', onClick: () => { setEditing(null); setFormOpen(true); } } : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-4 py-2.5 font-medium w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {item.model ?? <span className="font-sans text-gray-400 dark:text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <button
                          type="button"
                          className="btn-ghost p-1.5"
                          title="Edit"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="btn-ghost p-1.5 text-red-600 dark:text-red-400"
                          title="Delete"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProviderModal
        isOpen={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          invalidate();
        }}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
        title="Delete provider"
        message={`Delete "${deleting?.name ?? ''}" from the provider list? Existing configurations are not affected.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
