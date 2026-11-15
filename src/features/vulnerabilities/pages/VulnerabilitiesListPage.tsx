import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileCheck } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { SeverityBadge, PatchStatusBadge } from '../../../components/badges/PentestBadges';
import { FilterCard, useListFilters } from '../../../components/ui/FilterCard/FilterCard';
import { vulnerabilityApi } from '../../../core/api/services/vulnerability.api';
import { Vulnerability, Severity, PatchStatus } from '../../../domain/models/vulnerability.model';
import { SCAN_TOOL_LABELS } from '../../../domain/models/scan.model';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const PATCH_STATUSES: PatchStatus[] = ['Open', 'InProgress', 'Patched', 'AcceptedRisk', 'WontFix'];

// toolsUsed is stored server-side as a JSON string array, e.g. '["Nuclei","Naabu"]' or '["Manual"]'.
// Real tool identity must not be disclosed — map each entry through SCAN_TOOL_LABELS, falling
// back to the raw value only for non-tool entries like "Manual".
function formatToolsUsed(toolsUsed: string): string {
  try {
    const tools = JSON.parse(toolsUsed);
    if (!Array.isArray(tools) || tools.length === 0) return '—';
    return tools.map((tool) => SCAN_TOOL_LABELS[tool as keyof typeof SCAN_TOOL_LABELS] ?? tool).join(', ');
  } catch {
    return toolsUsed || '—';
  }
}

export const VulnerabilitiesListPage: React.FC = () => {
  const navigate = useNavigate();
  const filters = useListFilters();
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [patchStatus, setPatchStatus] = useState<PatchStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Any filter change invalidates the current page — a page number valid for one filter
  // combination can easily be out of range (or just show the wrong slice) for another.
  useEffect(() => {
    setPage(1);
  }, [filters.params, severity, patchStatus]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vulnerabilities', filters.params, severity, patchStatus, page, pageSize],
    queryFn: () =>
      vulnerabilityApi.getVulnerabilities({
        ...filters.params,
        severity: severity || undefined,
        patchStatus: patchStatus || undefined,
        page,
        pageSize,
      }),
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vulnerabilities</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Findings auto-created from scans and manually reported by pentesters</p>
      </div>

      <FilterCard
        values={filters.values}
        onChange={filters.setValues}
        showEngagement
        onReset={() => {
          filters.reset();
          setSeverity('');
          setPatchStatus('');
        }}
        extraActive={Boolean(severity || patchStatus)}
        dateLabel="First seen"
      >
        <div>
          <label className="label">Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | '')} className="input w-36">
            <option value="">All</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Patch status</label>
          <select value={patchStatus} onChange={(e) => setPatchStatus(e.target.value as PatchStatus | '')} className="input w-36">
            <option value="">All</option>
            {PATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </FilterCard>

      <DataTable
        columns={columns}
        data={vulnerabilities}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No vulnerabilities found', description: filters.isActive || severity || patchStatus ? 'No vulnerabilities match these filters' : 'Run a scan or add a manual finding to get started' }}
        actions={{
          add: {
            label: 'Add Finding',
            onClick: () =>
              navigate(filters.values.clientOrganizationId ? `/vulnerabilities/new?clientOrganizationId=${filters.values.clientOrganizationId}` : '/vulnerabilities/new'),
          },
        }}
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
