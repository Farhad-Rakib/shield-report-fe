import { RetestRequestStatus } from '../models/retest-request.model';

export interface CreateRetestRequestDto {
  assignedToUserId?: number | null;
  instructions?: string | null;
  cases?: string[] | null;
}

export interface RetestRequestCaseUpdateDto {
  id: number;
  isChecked: boolean;
}

export interface ResolveRetestRequestDto {
  outcome: RetestRequestStatus;
  resolutionNotes?: string | null;
  cases?: RetestRequestCaseUpdateDto[] | null;
}
