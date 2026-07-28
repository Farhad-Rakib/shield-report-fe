export type ReportStatus = 'PendingApproval' | 'Approved' | 'Rejected';

// Mirrors ShieldReport.Application.Reports.Dtos.ReportDto field-for-field.
export interface Report {
  id: number;
  publicId: string;
  engagementId: number;
  reportTemplateId: number;
  version: number;
  status: ReportStatus;
  executiveSummary: string;
  keyFindings: string;
  keyRecommendations: string;
  draftAvailable: boolean;
  pdfAvailable: boolean;
  generatedByUserId: number;
  generatedAt: string;
  approvedByUserId: number | null;
  approvedAt: string | null;
  rejectedByUserId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

// Mirrors ShieldReport.Application.Reports.Dtos.ReportEditorSessionDto field-for-field.
export interface ReportEditorSession {
  documentServerUrl: string;
  apiHostForContainer: string;
  accessToken: string;
  documentKey: string;
  fileName: string;
}
