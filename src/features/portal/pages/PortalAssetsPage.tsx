import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { DataTable, Column } from '../../../components/table/DataTable';
import { CriticalityBadge, EnvironmentBadge } from '../../../components/badges/PentestBadges';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { ClientAsset } from '../../../domain/models/client-asset.model';

export const PortalAssetsPage: React.FC = () => {
  const tokenPayload = useAuthStore((s) => s.tokenPayload);
  const clientOrganizationId = Number(tokenPayload?.clientOrganizationId);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-assets', clientOrganizationId],
    queryFn: () => clientAssetApi.getAssetsForClient(clientOrganizationId, { pageSize: 100 }),
    enabled: !!clientOrganizationId,
  });
  const assets = data?.data ?? [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Assets registered for testing — read-only</p>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No assets yet', description: 'Your pentest team will register assets here as they’re scoped for testing.' }}
        onRetry={() => refetch()}
      />
    </div>
  );
};
