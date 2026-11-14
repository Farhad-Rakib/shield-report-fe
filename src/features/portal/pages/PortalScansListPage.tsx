import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { ScanStatusBadge } from '../../../components/badges/PentestBadges';
import { scanApi } from '../../../core/api/services/scan.api';
import { Scan, getScanToolLabel } from '../../../domain/models/scan.model';

const extractErrorMessage = (error: unknown): string | undefined => {
  const err = error as { response?: { data?: { message?: string } }; message?: string } | null;
  return err?.response?.data?.message || err?.message;
};

export const PortalScansListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // No clientOrganizationId param — the backend's HasQueryFilter on Scan already scopes
  // results to the caller's own org (same pattern as PortalVulnerabilitiesPage). If the org
  // hasn't been opted into AllowScanConsoleAccess, the API 403s and its message surfaces below.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-scans', page, pageSize],
    queryFn: () => scanApi.getScans({ page, pageSize }),
  });
  const scans = data?.data ?? [];

  const columns: Column<Scan>[] = [
    { key: 'clientAssetName', label: 'Asset' },
    { key: 'tool', label: 'Tool', render: (_, scan) => <span className="text-sm text-gray-600 dark:text-gray-400">{getScanToolLabel(scan.tool, scan.toolLabel)}</span> },
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
    { icon: Eye, label: 'View', onClick: (scan) => navigate(`/portal/scans/${scan.publicId}`), variant: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scans</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Scans run against your assets — live output and results are on each scan's detail page</p>
      </div>

      <DataTable
        columns={columns}
        data={scans}
        isLoading={isLoading}
        error={extractErrorMessage(error)}
        searchable={false}
        emptyState={{ title: 'No scans found', description: 'Scans your pentest team runs against your assets will show up here.' }}
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
    </div>
  );
};
