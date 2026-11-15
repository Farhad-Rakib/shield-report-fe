import type { AssetType } from '../../../domain/models/client-asset.model';
import type { PatchStatus } from '../../../domain/models/vulnerability.model';
import type { FindingsReportAsset } from '../../../domain/models/findings-report.model';

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
