export type ScanTool = 'Naabu' | 'Nuclei' | 'Reconftw';
export type ScanStatus = 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

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
}
