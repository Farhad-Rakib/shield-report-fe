import type { AssetType } from '../../../domain/models/client-asset.model';
import type { PatchStatus } from '../../../domain/models/vulnerability.model';
import type { FindingsReport, FindingsReportAsset } from '../../../domain/models/findings-report.model';

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  WebUrl: 'Web URL',
  IpRange: 'IP range',
  MobileApp: 'Mobile app',
  Api: 'API',
  CloudEnvironment: 'Cloud',
  Other: 'Other',
};

export const PATCH_STATUS_LABEL: Record<PatchStatus, string> = {
  Open: 'Open',
  InProgress: 'In progress',
  Patched: 'Patched',
  AcceptedRisk: 'Accepted risk',
  WontFix: "Won't fix",
};

/** Stable key for an asset group; the "Unassigned asset" group has no asset id. */
export function assetKey(clientId: number, asset: Pick<FindingsReportAsset, 'id'>): string {
  return `${clientId}:${asset.id ?? 'unassigned'}`;
}

export function assetDomId(clientId: number, asset: Pick<FindingsReportAsset, 'id'>): string {
  return `fr-asset-${clientId}-${asset.id ?? 'unassigned'}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** One row per loaded vulnerability, plus one row per tested asset with no matching findings. */
export function buildFindingsCsv(report: FindingsReport): string {
  const header = ['Client', 'Asset', 'Identifier', 'Asset type', 'Severity', 'CVSS', 'Status', 'Title', 'Endpoint', 'Engagement', 'Detected', 'Closed'];
  const rows: string[] = [header.map(csvCell).join(',')];
  for (const client of report.clients) {
    for (const asset of client.assets) {
      const assetCols = [client.name, asset.name, asset.identifier ?? '', asset.assetType ? ASSET_TYPE_LABEL[asset.assetType] : ''];
      if (asset.vulnerabilities.length === 0) {
        rows.push([...assetCols, '', '', '', 'No matching findings', '', '', '', ''].map(csvCell).join(','));
        continue;
      }
      for (const v of asset.vulnerabilities) {
        rows.push(
          [
            ...assetCols,
            v.severity,
            v.cvssScore ?? '',
            PATCH_STATUS_LABEL[v.patchStatus] ?? v.patchStatus,
            v.title,
            v.endpoint,
            v.engagementTitle ?? '',
            v.detectedAt ? v.detectedAt.slice(0, 10) : '',
            v.closedAt ? v.closedAt.slice(0, 10) : '',
          ]
            .map(csvCell)
            .join(','),
        );
      }
    }
  }
  return rows.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
