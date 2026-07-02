import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { ScanStatusBadge } from '../../../components/badges/PentestBadges';
import { scanApi } from '../../../core/api/services/scan.api';
import { Scan } from '../../../domain/models/scan.model';

export const ScansListPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scans'],
    queryFn: () => scanApi.getScans({ pageSize: 50 }),
  });
  const scans = data?.data ?? [];

  const columns: Column<Scan>[] = [
    { key: 'clientAssetName', label: 'Asset' },
    { key: 'tool', label: 'Tool' },
    { key: 'status', label: 'Status', render: (_, scan) => <ScanStatusBadge status={scan.status} /> },
    {
      key: 'queuedAt',
      label: 'Queued',
      render: (_, scan) => <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(scan.queuedAt).toLocaleString()}</span>,
    },
    {
      key: 'completedAt',
      label: 'Completed',
      render: (_, scan) =>
        scan.completedAt ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(scan.completedAt).toLocaleString()}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  const rowActions: RowAction<Scan>[] = [
    { icon: Eye, label: 'View', onClick: (scan) => navigate(`/scans/${scan.publicId}`), variant: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scans</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">All scans across client assets — live output and results are on each scan's detail page</p>
      </div>

      <DataTable
        columns={columns}
        data={scans}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No scans found', description: 'Run a scan from the Client Assets page to get started' }}
        rowActions={rowActions}
        onRetry={() => refetch()}
      />
    </div>
  );
};
