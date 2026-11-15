import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronsDownUp, ChevronsUpDown, FileDown, FileSearch } from 'lucide-react';
import { FilterCard, useListFilters } from '../../../components/ui/FilterCard/FilterCard';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { Loader } from '../../../components/ui/Loader/Loader';
import { SEVERITY_DOT_CLASS, SeverityLevel } from '../../../components/ui/Severity/severity';
import { findingsReportApi } from '../../../core/api/services/findings-report.api';
import type { PatchStatus, Severity } from '../../../domain/models/vulnerability.model';
import type { FindingsReport, SeverityCounts } from '../../../domain/models/findings-report.model';
import { ExportFindingsPdfModal } from '../components/ExportFindingsPdfModal';
import { FindingsReportDetails } from '../components/FindingsReportDetails';
import { SeverityCountChips } from '../components/SeverityCountChips';
import { ASSET_TYPE_LABEL, PATCH_STATUS_LABEL, assetDomId, assetKey } from '../utils/findings-report.utils';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const PATCH_STATUSES: PatchStatus[] = ['Open', 'InProgress', 'Patched', 'AcceptedRisk', 'WontFix'];

/** Above this many loaded findings, asset sections start collapsed. */
const AUTO_COLLAPSE_THRESHOLD = 300;

const SEVERITY_TILES: { level: SeverityLevel; key: keyof SeverityCounts; label: string }[] = [
  { level: 'critical', key: 'critical', label: 'Critical' },
  { level: 'high', key: 'high', label: 'High' },
  { level: 'medium', key: 'medium', label: 'Medium' },
  { level: 'low', key: 'low', label: 'Low' },
  { level: 'info', key: 'informational', label: 'Info' },
];

function allKeys(report: FindingsReport | undefined) {
  const clients = new Set<number>();
  const assets = new Set<string>();
  for (const c of report?.clients ?? []) {
    clients.add(c.id);
    for (const a of c.assets) assets.add(assetKey(c.id, a));
  }
  return { clients, assets };
}

export function FindingsReportPage() {
  const filters = useListFilters();
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [patchStatus, setPatchStatus] = useState<PatchStatus | ''>('');
  const [collapsedClients, setCollapsedClients] = useState<Set<number>>(new Set());
  const [collapsedAssets, setCollapsedAssets] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const reportParams = useMemo(
    () => ({ ...filters.params, severity: severity || undefined, patchStatus: patchStatus || undefined }),
    [filters.params, severity, patchStatus],
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['findings-report', reportParams],
    queryFn: () => findingsReportApi.getReport(reportParams),
  });

  // Fresh data: expand everything unless it's large, then start with assets collapsed.
  useEffect(() => {
    if (!data) return;
    const loaded = data.clients.reduce((n, c) => n + c.assets.reduce((m, a) => m + a.vulnerabilities.length, 0), 0);
    setCollapsedClients(new Set());
    setCollapsedAssets(loaded > AUTO_COLLAPSE_THRESHOLD ? allKeys(data).assets : new Set());
  }, [data]);

  const testedAssets = useMemo(
    () =>
      (data?.clients ?? []).flatMap((client) =>
        client.assets.filter((a) => a.id !== null).map((asset) => ({ client, asset })),
      ),
    [data],
  );

  const toggle = <T,>(set: Set<T>, key: T) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const expandAll = () => {
    setCollapsedClients(new Set());
    setCollapsedAssets(new Set());
  };

  const collapseAll = () => {
    const keys = allKeys(data);
    setCollapsedClients(keys.clients);
    setCollapsedAssets(keys.assets);
  };

  const jumpToAsset = (clientId: number, asset: { id: number | null }) => {
    setCollapsedClients((s) => {
      const next = new Set(s);
      next.delete(clientId);
      return next;
    });
    setCollapsedAssets((s) => {
      const next = new Set(s);
      next.delete(assetKey(clientId, asset));
      return next;
    });
    window.setTimeout(() => {
      document.getElementById(assetDomId(clientId, asset))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const selectClient = (clientId: number) => {
    filters.setValues({ ...filters.values, clientOrganizationId: String(clientId), clientAssetId: '' });
  };

  const handleReset = () => {
    filters.reset();
    setSeverity('');
    setPatchStatus('');
  };

  // One-line summary of the filters being exported (names from the loaded report when present).
  const filterDescription = useMemo(() => {
    const { clientOrganizationId, clientAssetId, from, to } = reportParams;
    const client = clientOrganizationId
      ? data?.clients.find((c) => c.id === clientOrganizationId)?.name ?? `Client #${clientOrganizationId}`
      : 'All clients';
    const asset = clientAssetId
      ? data?.clients.flatMap((c) => c.assets).find((a) => a.id === clientAssetId)?.name ?? `Asset #${clientAssetId}`
      : 'All assets';
    const period = from && to ? `${from} to ${to}` : from ? `from ${from}` : to ? `until ${to}` : 'any date';
    return [
      client,
      asset,
      `tested ${period}`,
      severity || 'all severities',
      patchStatus ? PATCH_STATUS_LABEL[patchStatus] : 'all statuses',
    ].join(' · ');
  }, [reportParams, data, severity, patchStatus]);

  const hasData = Boolean(data && data.clients.length > 0);
  const summary = data?.summary;

  return (
    <div className="space-y-5">

      <div className="page-header mb-0">
        <div>
          <p className="page-eyebrow">Reporting</p>
          <h1 className="page-title">Findings Report</h1>
          <p className="page-subtitle">
            Clients and assets tested in the selected period, with their vulnerabilities grouped by client and asset.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => setExportOpen(true)} disabled={isLoading || isFetching || !!error}>
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      <ExportFindingsPdfModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={reportParams}
        filterDescription={filterDescription}
      />

      <div>
        <FilterCard
          values={filters.values}
          onChange={filters.setValues}
          onReset={handleReset}
          dateLabel="Tested"
          extraActive={Boolean(severity || patchStatus)}
        >
          <div>
            <label className="label">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | '')} className="input w-36">
              <option value="">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={patchStatus} onChange={(e) => setPatchStatus(e.target.value as PatchStatus | '')} className="input w-36">
              <option value="">All statuses</option>
              {PATCH_STATUSES.map((s) => (
                <option key={s} value={s}>{PATCH_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </FilterCard>
      </div>

      {isLoading ? (
        <div className="panel">
          <Loader text="Building findings report…" />
        </div>
      ) : error ? (
        <div className="panel">
          <ErrorState
            title="Couldn't load the findings report"
            message={error instanceof Error ? error.message : 'Unexpected error'}
            retry={() => refetch()}
          />
        </div>
      ) : !data || !summary || !hasData ? (
        <div className="panel">
          <EmptyState
            icon={FileSearch}
            title="Nothing tested in this period"
            description="No assets were scanned and no findings were recorded for the selected filters. Try a wider date range or another client."
            action={filters.isActive || severity || patchStatus ? { label: 'Reset filters', onClick: handleReset } : undefined}
          />
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {data.truncated && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-13 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Showing the {data.vulnerabilityLimit.toLocaleString()} most severe findings. Counts are complete; narrow the filters to list
                everything.
              </span>
            </div>
          )}

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile label="Clients" value={summary.clientCount} />
            <KpiTile label="Assets tested" value={summary.assetsTested} />
            <KpiTile label="Findings" value={summary.totalVulnerabilities} />
            <KpiTile label="Open" value={summary.openVulnerabilities} tone="danger" />
            <KpiTile label="Closed" value={summary.closedVulnerabilities} tone="success" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SEVERITY_TILES.map(({ level, key, label }) => (
              <div key={level} className="panel flex items-center justify-between px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span className={`status-dot h-2 w-2 ${SEVERITY_DOT_CLASS[level]}`} aria-hidden="true" />
                  {label}
                </span>
                <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{summary.bySeverity[key]}</span>
              </div>
            ))}
          </div>

          {/* Clients + assets tested */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="panel flex flex-col">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Clients</h2>
                  <p className="panel-subtitle">Click a client to filter the report to it</p>
                </div>
                <span className="badge-neutral">{data.clients.length}</span>
              </div>
              <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {data.clients.map((client) => {
                  const selected = filters.values.clientOrganizationId === String(client.id);
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => selectClient(client.id)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          selected ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-13 font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {client.assetsTested} asset{client.assetsTested === 1 ? '' : 's'} · {client.counts.total} finding
                            {client.counts.total === 1 ? '' : 's'}
                          </p>
                        </div>
                        <SeverityCountChips counts={client.counts} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="panel flex flex-col">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Assets tested</h2>
                  <p className="panel-subtitle">Click an asset to jump to its findings</p>
                </div>
                <span className="badge-neutral">{testedAssets.length}</span>
              </div>
              {testedAssets.length === 0 ? (
                <p className="px-4 py-3 text-13 text-gray-500 dark:text-gray-400">No assets tested; only unassigned findings matched.</p>
              ) : (
                <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                  {testedAssets.map(({ client, asset }) => (
                    <li key={assetKey(client.id, asset)}>
                      <button
                        type="button"
                        onClick={() => jumpToAsset(client.id, asset)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-13 font-medium text-gray-900 dark:text-gray-100">
                            {asset.name}
                            {asset.identifier && (
                              <span className="ml-1.5 font-mono text-xs font-normal text-gray-500 dark:text-gray-400">{asset.identifier}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {client.name}
                            {asset.assetType ? ` · ${ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}` : ''} · {asset.scanCount} scan
                            {asset.scanCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <SeverityCountChips counts={asset.counts} emptyLabel="0 findings" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Findings by client and asset</h2>
              <div className="flex items-center gap-1">
                <button type="button" className="btn-ghost btn-sm" onClick={expandAll}>
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  Expand all
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={collapseAll}>
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  Collapse all
                </button>
              </div>
            </div>
            <FindingsReportDetails
              clients={data.clients}
              collapsedClients={collapsedClients}
              collapsedAssets={collapsedAssets}
              onToggleClient={(id) => setCollapsedClients((s) => toggle(s, id))}
              onToggleAsset={(key) => setCollapsedAssets((s) => toggle(s, key))}
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'success' }) {
  const valueClass =
    tone === 'danger'
      ? 'text-red-700 dark:text-red-400'
      : tone === 'success'
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-gray-900 dark:text-white';
  return (
    <div className="panel px-4 py-3">
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}
