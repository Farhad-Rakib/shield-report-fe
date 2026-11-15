import type { PatchStatus, Severity } from '../models/vulnerability.model';
import type { FindingsReport } from '../models/findings-report.model';
import type { ReportTemplateField } from '../models/report-template.model';

/** Query params for GET /findings-report. Dates are yyyy-MM-dd; `to` is inclusive. */
export interface GetFindingsReportRequestDto {
  clientOrganizationId?: number;
  clientAssetId?: number;
  from?: string;
  to?: string;
  severity?: Severity;
  patchStatus?: PatchStatus;
}

export type GetFindingsReportResponseDto = FindingsReport;

/** A Findings summary report template offered by GET /findings-report/templates. */
export interface FindingsReportTemplateOptionDto {
  id: number;
  name: string;
  companyDisplayName: string;
  customFields: ReportTemplateField[];
}

/** Body of POST /findings-report/export-pdf: the page's current filters plus the chosen template. */
export interface ExportFindingsReportPdfRequestDto {
  templateId: number;
  filters: GetFindingsReportRequestDto;
  customFieldValues: Record<string, string>;
}
