// Mirrors ShieldReport.Application.Common.Interfaces.AuditLogRow.
export interface AuditLogEntry {
  id: number;
  createdAt: string;
  userId: number | null;
  userEmail: string | null;
  entityName: string;
  entityId: string;
  action: string;
  // JSON: {"Prop": {"old": ..., "new": ...}} for data changes, free-form details for security events.
  changes: string | null;
  ipAddress: string | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  userId?: number;
  entityName?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
}
