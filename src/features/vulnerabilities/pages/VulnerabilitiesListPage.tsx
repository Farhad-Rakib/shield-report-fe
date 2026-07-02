import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileCheck } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { SeverityBadge, PatchStatusBadge } from '../../../components/badges/PentestBadges';
import { vulnerabilityApi } from '../../../core/api/services/vulnerability.api';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { Vulnerability, Severity, PatchStatus } from '../../../domain/models/vulnerability.model';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const PATCH_STATUSES: PatchStatus[] = ['Open', 'InProgress', 'Patched', 'AcceptedRisk', 'WontFix'];

// toolsUsed is stored server-side as a JSON string array, e.g. '["Nuclei","Naabu"]' or '["Manual"]'.
function formatToolsUsed(toolsUsed: string): string {
  try {
    const tools = JSON.parse(toolsUsed);
    return Array.isArray(tools) && tools.length > 0 ? tools.join(', ') : '—';
  } catch {
    return toolsUsed || '—';
  }
}

export const VulnerabilitiesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [clientOrganizationId, setClientOrganizationId] = useState<number | null>(null);
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [patchStatus, setPatchStatus] = useState<PatchStatus | ''>('');

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vulnerabilities', clientOrganizationId, severity, patchStatus],
    queryFn: () =>
      vulnerabilityApi.getVulnerabilities({
        clientOrganizationId: clientOrganizationId!,
        severity: severity || undefined,
        patchStatus: patchStatus || undefined,
        pageSize: 100,
      }),
    enabled: clientOrganizationId !== null,
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
    { key: 'toolsUsed', label: 'Tool', render: (_, v) => <span className="text-sm text-gray-600 dark:text-gray-400">{formatToolsUsed(v.toolsUsed)}</span> },
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
    { icon: Eye, label: 'View', onClick: (v) => navigate(`/vulnerabilities/${v.id}`), variant: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vulnerabilities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Findings auto-created from scans and manually reported by pentesters</p>
        </div>
        <div className="flex items-end gap-3">
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
                className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            )}
          </div>
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
        emptyState={{ title: 'No vulnerabilities found', description: 'Run a scan or add a manual finding to get started' }}
        actions={{ add: { label: 'Add Finding', onClick: () => navigate(`/vulnerabilities/new?clientOrganizationId=${clientOrganizationId}`) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
      />
    </div>
  );
};
