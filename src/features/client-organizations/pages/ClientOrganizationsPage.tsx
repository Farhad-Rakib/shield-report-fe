import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Mail } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { ClientOrganization } from '../../../domain/models/client-organization.model';
import { CreateClientOrganizationRequestDto, UpdateClientOrganizationRequestDto } from '../../../domain/dto/client-organization.dto';

export const ClientOrganizationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOrg, setEditOrg] = useState<ClientOrganization | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-organizations'],
    queryFn: () => clientOrganizationApi.getOrganizations(),
  });
  const organizations = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateClientOrganizationRequestDto) => clientOrganizationApi.createOrganization(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      toast.success('Client organization created successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create client organization'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateClientOrganizationRequestDto }) =>
      clientOrganizationApi.updateOrganization(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      toast.success('Client organization updated successfully');
      setEditOrg(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to update client organization'),
  });

  const orgFields: FormField[] = [
    { name: 'name', label: 'Organization Name', type: 'text', required: true, placeholder: 'Acme Corp' },
    { name: 'primaryContactName', label: 'Primary Contact Name', type: 'text', placeholder: 'Jane Doe' },
    { name: 'primaryContactEmail', label: 'Primary Contact Email', type: 'email', placeholder: 'jane@acme.com' },
    { name: 'allowSelfServiceScanning', label: 'Allow Self-Service Scanning', type: 'switch', defaultValue: true },
  ];

  const editFields: FormField[] = [
    { name: 'name', label: 'Organization Name', type: 'text', required: true, defaultValue: editOrg?.name },
    { name: 'primaryContactName', label: 'Primary Contact Name', type: 'text', defaultValue: editOrg?.primaryContactName || '' },
    { name: 'primaryContactEmail', label: 'Primary Contact Email', type: 'email', defaultValue: editOrg?.primaryContactEmail || '' },
    { name: 'allowSelfServiceScanning', label: 'Allow Self-Service Scanning', type: 'switch', defaultValue: editOrg?.allowSelfServiceScanning ?? true },
  ];

  const handleCreate = (data: Record<string, any>) => {
    createMutation.mutate({
      name: data.name,
      primaryContactName: data.primaryContactName || null,
      primaryContactEmail: data.primaryContactEmail || null,
      allowSelfServiceScanning: data.allowSelfServiceScanning ?? true,
    });
  };

  const handleUpdate = (data: Record<string, any>) => {
    if (!editOrg) return;
    updateMutation.mutate({
      id: editOrg.id,
      dto: {
        name: data.name,
        primaryContactName: data.primaryContactName || null,
        primaryContactEmail: data.primaryContactEmail || null,
        allowSelfServiceScanning: data.allowSelfServiceScanning ?? true,
      },
    });
  };

  const columns: Column<ClientOrganization>[] = [
    { key: 'name', label: 'Organization', render: (_, org) => <p className="font-medium text-gray-900 dark:text-white">{org.name}</p> },
    {
      key: 'primaryContactName',
      label: 'Primary Contact',
      render: (_, org) =>
        org.primaryContactName ? (
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{org.primaryContactName}</p>
            {org.primaryContactEmail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />{org.primaryContactEmail}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">No contact on file</span>
        ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, org) => (
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            org.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {org.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'allowSelfServiceScanning',
      label: 'Self-Service Scanning',
      render: (_, org) => (
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            org.allowSelfServiceScanning
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {org.allowSelfServiceScanning ? 'Allowed' : 'Disabled'}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<ClientOrganization>[] = [
    { icon: Pencil, label: 'Edit', onClick: (org) => setEditOrg(org), variant: 'primary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Organizations</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Register and manage the client organizations engaged for pentesting</p>
      </div>

      <DataTable
        columns={columns}
        data={organizations}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No client organizations found', description: 'Register a client organization to get started' }}
        actions={{ add: { label: 'Add Organization', onClick: () => setShowAddModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Client Organization" size="md">
        <DynamicForm
          fields={orgFields}
          onSubmit={handleCreate}
          submitLabel="Register Organization"
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={editOrg !== null} onClose={() => setEditOrg(null)} title="Edit Client Organization" size="md">
        {editOrg && (
          <DynamicForm
            key={editOrg.id}
            fields={editFields}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
            onCancel={() => setEditOrg(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
};
