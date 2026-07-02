import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileCheck } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { SeverityBadge, PatchStatusBadge } from '../../../components/badges/PentestBadges';
import { vulnerabilityApi } from '../../../core/api/services/vulnerability.api';
import { Vulnerability, Severity, PatchStatus } from '../../../domain/models/vulnerability.model';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const PATCH_STATUSES: PatchStatus[] = ['Open', 'InProgress', 'Patched', 'AcceptedRisk', 'WontFix'];

export const PortalVulnerabilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [patchStatus, setPatchStatus] = useState<PatchStatus | ''>('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-vulnerabilities', severity, patchStatus],
    queryFn: () => vulnerabilityApi.getVulnerabilities({ severity: severity || undefined, patchStatus: patchStatus || undefined, pageSize: 100 }),
  });
  const vulnerabilities = data?.data ?? [];

  const columns: Column<Vulnerability>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (_, v) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{v.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{v.endpoint}</p>
        </div>
      ),
    },
    { key: 'clientAssetName', label: 'Asset', render: (_, v) => <span className="text-sm text-gray-600 dark:text-gray-400">{v.clientAssetName ?? '—'}</span> },
    { key: 'severity', label: 'Severity', render: (_, v) => <SeverityBadge severity={v.severityOverride ?? v.severity} /> },
    { key: 'patchStatus', label: 'Patch Status', render: (_, v) => <PatchStatusBadge patchStatus={v.patchStatus} /> },
    {
      key: 'daysOpen',
      label: 'Days Open',
      render: (_, v) => <span className="text-sm text-gray-600 dark:text-gray-400">{v.daysOpen ?? '—'}</span>,
    },
    {
      key: 'reportIncluded',
      label: 'In Report',
      render: (_, v) =>
        v.reportIncluded ? <FileCheck className="w-4 h-4 text-emerald-600" /> : <span className="text-xs text-gray-400">—</span>,
    },
  ];

  const rowActions: RowAction<Vulnerability>[] = [
    { icon: Eye, label: 'View', onClick: (v) => navigate(`/portal/vulnerabilities/${v.id}`), variant: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vulnerabilities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Findings from your engagements — read-only</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity | '')}
              className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Patch Status</label>
            <select
              value={patchStatus}
              onChange={(e) => setPatchStatus(e.target.value as PatchStatus | '')}
              className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {PATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vulnerabilities}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No vulnerabilities found', description: 'Findings from your engagements will show up here.' }}
        rowActions={rowActions}
        onRetry={() => refetch()}
      />
    </div>
  );
};
