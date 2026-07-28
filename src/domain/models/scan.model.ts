export type ScanTool = 'Naabu' | 'Nuclei' | 'Reconftw';
export type ScanStatus = 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

// Real tool identity must not be disclosed to clients — every client-facing surface renders
// this generic label instead of the raw ScanTool value.
export const SCAN_TOOL_LABELS: Record<ScanTool, string> = {
  Naabu: 'Port Checking',
  Nuclei: 'Vulnerability Scanning',
  Reconftw: 'Reconnaissance',
};

export function getScanToolLabel(tool: ScanTool): string {
  return SCAN_TOOL_LABELS[tool];
}

export interface ScanFindingRaw {
  id: number;
  scanId: number;
  rawOutputJson: string;
  parsedTitle: string | null;
  parsedEndpoint: string | null;
  parsedSeverityRaw: string | null;
  processedAt: string | null;
  resultingVulnerabilityId: number | null;
}

export interface Scan {
  id: number;
  publicId: string;
  clientOrganizationId: number;
  clientAssetId: number;
  clientAssetName: string;
  engagementId: number | null;
  engagementTaskId: number | null;
  tool: ScanTool;
  status: ScanStatus;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  requestedByUserId: number;
  errorMessage: string | null;
  rawOutput: string | null;
  nextScanPublicId: string | null;
}
