import { Link } from 'react-router-dom';
import { Building2, ChevronDown, ChevronRight, Server } from 'lucide-react';
import { SeverityPill } from '../../../components/ui/Severity/SeverityPill';
import { PatchStatusBadge } from '../../../components/badges/PentestBadges';
import type { FindingsReportAsset, FindingsReportClient } from '../../../domain/models/findings-report.model';
import { SeverityCountChips } from './SeverityCountChips';
import { ASSET_TYPE_LABEL, assetDomId, assetKey, formatDate } from '../utils/findings-report.utils';

interface FindingsReportDetailsProps {
  clients: FindingsReportClient[];
  collapsedClients: Set<number>;
  collapsedAssets: Set<string>;
  onToggleClient: (clientId: number) => void;
  onToggleAsset: (key: string) => void;
}

/** Client → Asset → Vulnerability sections. */
export function FindingsReportDetails({ clients, collapsedClients, collapsedAssets, onToggleClient, onToggleAsset }: FindingsReportDetailsProps) {
  return (
    <div className="space-y-4">
      {clients.map((client) => {
        const clientOpen = !collapsedClients.has(client.id);
        return (
          <section key={client.id} className="panel overflow-hidden print:break-inside-avoid-page">
            <button
              type="button"
              onClick={() => onToggleClient(client.id)}
              className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              aria-expanded={clientOpen}
            >
              {clientOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 print:hidden" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 print:hidden" />
              )}
              <Building2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{client.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {client.assetsTested} asset{client.assetsTested === 1 ? '' : 's'} tested · {client.counts.total} finding
                  {client.counts.total === 1 ? '' : 's'} · {client.openVulnerabilities} open
                </p>
              </div>
              <SeverityCountChips counts={client.counts} />
            </button>

            {clientOpen && (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {client.assets.length === 0 ? (
                  <p className="px-4 py-3 text-13 text-gray-500 dark:text-gray-400">No assets tested in this period.</p>
                ) : (
                  client.assets.map((asset) => (
                    <AssetSection
                      key={assetKey(client.id, asset)}
                      clientId={client.id}
                      asset={asset}
                      open={!collapsedAssets.has(assetKey(client.id, asset))}
                      onToggle={() => onToggleAsset(assetKey(client.id, asset))}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AssetSection({ clientId, asset, open, onToggle }: { clientId: number; asset: FindingsReportAsset; open: boolean; onToggle: () => void }) {
  const unassigned = asset.id === null;
  return (
    <div id={assetDomId(clientId, asset)} className="scroll-mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 bg-gray-50/70 px-4 py-2.5 pl-8 text-left hover:bg-gray-100 dark:bg-gray-950/40 dark:hover:bg-gray-800/60"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 print:hidden" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 print:hidden" />
        )}
        <Server className={`h-3.5 w-3.5 shrink-0 ${unassigned ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-13 font-medium ${unassigned ? 'italic text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {asset.name}
            </span>
            {asset.identifier && <span className="code-chip max-w-xs truncate">{asset.identifier}</span>}
            {asset.assetType && <span className="badge-neutral">{ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}</span>}
          </div>
          {!unassigned && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {asset.scanCount} scan{asset.scanCount === 1 ? '' : 's'} · last scanned {formatDate(asset.lastScannedAt)} · {asset.openVulnerabilities} open
            </p>
          )}
        </div>
        <SeverityCountChips counts={asset.counts} emptyLabel="0 findings" />
      </button>

      {open && (
        asset.vulnerabilities.length === 0 ? (
          <p className="px-4 py-3 pl-14 text-13 text-gray-500 dark:text-gray-400">
            {asset.counts.total > 0 ? 'Findings not loaded (result limit reached).' : 'No matching findings for this asset.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-white dark:bg-gray-900">
                <tr>
                  <th className="table-th pl-14">Severity</th>
                  <th className="table-th">Title</th>
                  <th className="table-th">CVSS</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Endpoint</th>
                  <th className="table-th">Engagement</th>
                  <th className="table-th">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                {asset.vulnerabilities.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="table-td pl-14 whitespace-nowrap">
                      <SeverityPill severity={v.severity} />
                    </td>
                    <td className="table-td min-w-[16rem]">
                      <Link to={`/vulnerabilities/${v.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                        {v.title}
                      </Link>
                    </td>
                    <td className="table-td mono whitespace-nowrap">{v.cvssScore !== null ? v.cvssScore.toFixed(1) : '—'}</td>
                    <td className="table-td whitespace-nowrap">
                      <PatchStatusBadge patchStatus={v.patchStatus} />
                    </td>
                    <td className="table-td max-w-xs">
                      <span className="mono block truncate text-gray-600 dark:text-gray-400" title={v.endpoint}>{v.endpoint}</span>
                    </td>
                    <td className="table-td whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {v.engagementId && v.engagementTitle ? (
                        <Link to={`/engagements/${v.engagementId}`} className="hover:underline">{v.engagementTitle}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(v.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
