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
  // HTML engine (empty/false for legacy Word-engine reports).
  projectGoals: string;
  limitations: string;
  scopeStatuses: Record<string, string>;
  showToolNames: boolean;
  hasHtmlPreview: boolean;
  // Where the three narrative sections came from; Drafting = AI job still running.
  narrativeStatus: 'Manual' | 'Drafting' | 'Drafted' | 'Failed';
  narrativeError: string | null;
  templateName: string | null;
  // The template's dynamic fields and this report's values ({{Custom.key}}).
  customFields?: import('./report-template.model').ReportTemplateField[] | null;
  customFieldValues?: Record<string, string> | null;
}

export interface ReportTemplateOption {
  id: number;
  name: string;
  isDefault: boolean;
  engine: 'Html' | 'Word';
  isCustomHtml: boolean;
  // Built-in White/Gray/Black Box template row; null = admin-created.
  builtInTestingType?: 'White' | 'Gray' | 'Black' | null;
}

export interface GenerateReportOptions {
  templateId: number | null;
  testingType: 'White' | 'Gray' | 'Black' | null;
  draftWithAi: boolean;
  showToolNames: boolean;
}

export interface ReportRecipientOption {
  email: string;
  name: string;
  source: string; // Primary contact | Client admin | Client user
}

export interface ReportDelivery {
  id: number;
  reportId: number;
  status: 'Pending' | 'Sent' | 'PartiallySent' | 'Failed';
  recipients: string[];
  deliveredTo: string[];
  message: string | null;
  attachWord: boolean;
  sentByUserId: number;
  sentByName: string | null;
  createdAt: string;
  completedAt: string | null;
  lastError: string | null;
}

// Client portal view of an approved report.
export interface ClientReport {
  id: number;
  engagementTitle: string;
  version: number;
  approvedAt: string | null;
  pdfAvailable: boolean;
  wordAvailable: boolean;
}

export interface UpdateReportSectionsRequest {
  projectGoals: string;
  limitations: string;
  scopeStatuses: Record<string, string>;
  showToolNames: boolean;
  customFieldValues?: Record<string, string>;
}
