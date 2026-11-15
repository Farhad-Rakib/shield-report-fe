/**
 * Standard list filters accepted by the staff list endpoints (engagements, client organizations,
 * assets, scans, vulnerabilities). Dates are `yyyy-MM-dd`; `to` is inclusive of the whole day.
 */
export interface ListFilterQuery {
  clientOrganizationId?: number;
  clientAssetId?: number;
  /** Only sent by pages that show the engagement filter (vulnerabilities, findings report). */
  engagementId?: number;
  from?: string;
  to?: string;
}
