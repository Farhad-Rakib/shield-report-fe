import type { PatchStatus, Severity } from '../models/vulnerability.model';
import type { FindingsReport } from '../models/findings-report.model';

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
