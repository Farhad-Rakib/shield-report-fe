import { ScanTool } from './scan.model';

export type ScanAuthorizationStatus = 'Active' | 'Scheduled' | 'Expired' | 'Revoked';

// Mirrors ShieldReport.Application.ScanAuthorizations.Dtos.ScanAuthorizationDto.
export interface ScanAuthorization {
  id: number;
  clientAssetId: number;
  engagementId: number | null;
  status: ScanAuthorizationStatus;
  validFrom: string;
  validUntil: string | null;
  allowedTools: ScanTool[];
  clientContactName: string | null;
  clientContactEmail: string | null;
  notes: string | null;
  authorizedByUserId: number;
  authorizedByEmail: string | null;
  createdAt: string;
  hasEvidence: boolean;
  evidenceFileName: string | null;
  evidenceUploadedAt: string | null;
  revokedAt: string | null;
  revokedByUserId: number | null;
  revokedByEmail: string | null;
  revocationReason: string | null;
}

export interface CreateScanAuthorizationRequest {
  engagementId?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  allowedTools?: ScanTool[];
  clientContactName?: string | null;
  clientContactEmail?: string | null;
  notes?: string | null;
}
