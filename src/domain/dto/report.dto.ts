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
}

export interface UpdateReportTemplateRequestDto {
  name: string;
  companyDisplayName: string;
}
