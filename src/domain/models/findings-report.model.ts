import type { AssetType } from './client-asset.model';
import type { PatchStatus, Severity } from './vulnerability.model';

// Mirrors ShieldReport.Application.FindingsReport.Dtos (GET /findings-report).

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  total: number;
}

export interface FindingsReportSummary {
  clientCount: number;
  assetsTested: number;
  totalVulnerabilities: number;
  openVulnerabilities: number;
  closedVulnerabilities: number;
  bySeverity: SeverityCounts;
}

export interface FindingsReportVulnerability {
  id: number;
  title: string;
  /** Effective severity (the override when one is set). */
  severity: Severity;
  cvssScore: number | null;
  patchStatus: PatchStatus;
  endpoint: string;
  engagementId: number | null;
  engagementTitle: string | null;
  detectedAt: string;
  closedAt: string | null;
}

/** `id` is null for the "Unassigned asset" group (findings without an asset). */
export interface FindingsReportAsset {
  id: number | null;
  name: string;
  identifier: string | null;
  assetType: AssetType | null;
  lastScannedAt: string | null;
  scanCount: number;
  openVulnerabilities: number;
  counts: SeverityCounts;
  vulnerabilities: FindingsReportVulnerability[];
}

export interface FindingsReportClient {
  id: number;
  name: string;
  assetsTested: number;
  openVulnerabilities: number;
  counts: SeverityCounts;
  assets: FindingsReportAsset[];
}

export interface FindingsReport {
  summary: FindingsReportSummary;
  clients: FindingsReportClient[];
  /** True when more vulnerabilities matched than `vulnerabilityLimit`; counts are still exact. */
  truncated: boolean;
  vulnerabilityLimit: number;
  generatedAt: string;
}
