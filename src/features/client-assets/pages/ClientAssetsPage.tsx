import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { CriticalityBadge, EnvironmentBadge } from '../../../components/badges/PentestBadges';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { Permissions } from '../../../core/constants/permissions';
import { ScanAuthorizationModal } from '../components/ScanAuthorizationModal';
import { ClientAsset } from '../../../domain/models/client-asset.model';
import { CreateClientAssetRequestDto } from '../../../domain/dto/client-asset.dto';

export const ClientAssetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [clientOrganizationId, setClientOrganizationId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [authorizationAsset, setAuthorizationAsset] = useState<ClientAsset | null>(null);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
  });
  const organizations = orgData?.data ?? [];

  useEffect(() => {
    if (clientOrganizationId === null && organizations.length > 0) {
      setClientOrganizationId(organizations[0].id);
    }
  }, [organizations, clientOrganizationId]);

  useEffect(() => {
    setPage(1);
  }, [clientOrganizationId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-assets', clientOrganizationId, page, pageSize],
    queryFn: () => clientAssetApi.getAssetsForClient(clientOrganizationId!, { page, pageSize }),
    enabled: clientOrganizationId !== null,
  });
  const assets = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateClientAssetRequestDto) => clientAssetApi.createAsset(clientOrganizationId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-assets', clientOrganizationId] });
      toast.success('Asset registered successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to register asset'),
  });

  const createFields: FormField[] = [
    { name: 'name', label: 'Asset Name', type: 'text', required: true, placeholder: 'Public Web App' },
    {
      name: 'assetType',
      label: 'Asset Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Web URL', value: 'WebUrl' },
        { label: 'IP Range', value: 'IpRange' },
        { label: 'Mobile App', value: 'MobileApp' },
        { label: 'API', value: 'Api' },
        { label: 'Cloud Environment', value: 'CloudEnvironment' },
        { label: 'Other', value: 'Other' },
      ],
    },
    { name: 'identifier', label: 'Identifier (URL / IP / Package)', type: 'text', required: true, placeholder: 'https://app.example.com' },
    {
      name: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      options: [
        { label: 'Unknown', value: 'Unknown' },
        { label: 'Development', value: 'Development' },
        { label: 'Staging', value: 'Staging' },
        { label: 'Production', value: 'Production' },
      ],
    },
  ];

  const handleCreate = (data: Record<string, any>) => {
    createMutation.mutate({
      clientOrganizationId: clientOrganizationId!,
      name: data.name,
      assetType: data.assetType,
      identifier: data.identifier,
      environment: data.environment,
      criticality: 'Low',
    });
  };

  const columns: Column<ClientAsset>[] = [
    {
      key: 'name',
      label: 'Asset',
      render: (_, asset) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{asset.identifier}</p>
        </div>
      ),
    },
    { key: 'assetType', label: 'Type' },
    { key: 'environment', label: 'Environment', render: (_, asset) => <EnvironmentBadge environment={asset.environment} /> },
    { key: 'criticality', label: 'Criticality', render: (_, asset) => <CriticalityBadge criticality={asset.criticality} /> },
    {
      key: 'isAuthorizedForScanning',
      label: 'Scan Authorization',
      render: (_, asset) =>
        asset.isAuthorizedForScanning ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <ShieldCheck className="w-3 h-3" /> Authorized
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <ShieldOff className="w-3 h-3" /> Not Authorized
          </span>
        ),
    },
  ];

  const rowActions: RowAction<ClientAsset>[] = [
    {
      icon: ShieldCheck,
      label: 'Scan Authorization',
      onClick: (asset) => setAuthorizationAsset(asset),
      variant: 'primary',
      show: () => hasPermission(Permissions.ScanAuthorizationsRead),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Assets</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Register assets and record the client's scan authorization (approval, evidence, validity window, allowed tools) — scans are launched from an engagement and only run while an authorization covers them
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Organization</label>
          {organizations.length === 0 ? (
            <Link to="/clients" className="text-sm text-blue-600 hover:underline">
              Register a client organization first
            </Link>
          ) : (
            <select
              value={clientOrganizationId ?? ''}
              onChange={(e) => setClientOrganizationId(Number(e.target.value))}
              className="w-56 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No assets found', description: 'Register an asset for this client organization to get started' }}
        actions={{ add: { label: 'Add Asset', onClick: () => setShowAddModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
        pagination={{
          currentPage: data?.page ?? page,
          totalPages: data?.totalPages ?? 1,
          pageSize: data?.pageSize ?? pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Asset" size="md">
        <DynamicForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="Register Asset"
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <ScanAuthorizationModal
        asset={authorizationAsset}
        canManage={hasPermission(Permissions.ScanAuthorizationsManage)}
        onClose={() => setAuthorizationAsset(null)}
      />
    </div>
  );
};
