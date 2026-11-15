import type { ReportTemplateKind } from '../models/report-template.model';
export interface UpdateReportNarrativeRequestDto {
  executiveSummary: string;
  keyFindings: string;
  keyRecommendations: string;
}

export interface RejectReportRequestDto {
  reason: string;
}

export interface CreateReportTemplateRequestDto {
  name: string;
  companyDisplayName: string;
  /** Defaults to Engagement on the server. */
  kind?: ReportTemplateKind;
}

export interface UpdateReportTemplateRequestDto {
  name: string;
  companyDisplayName: string;
}
