export type RetestRequestStatus = 'Pending' | 'VerifiedClosed' | 'Reopened';

export interface RetestRequestCase {
  id: number;
  caseText: string;
  isChecked: boolean;
}

// Mirrors ShieldReport.Application.RetestRequests.Dtos.RetestRequestDto field-for-field.
export interface RetestRequest {
  id: number;
  vulnerabilityId: number;
  requestedByUserId: number;
  requestedByUserName: string;
  requestedAt: string;
  assignedToUserId: number | null;
  assignedToUserName: string | null;
  instructions: string | null;
  status: RetestRequestStatus;
  resolvedByUserId: number | null;
  resolvedByUserName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  cases: RetestRequestCase[];
}
