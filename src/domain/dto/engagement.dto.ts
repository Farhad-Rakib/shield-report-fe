import { TestingType, EngagementStatus, EngagementTaskStatus } from '../models/engagement.model';

export interface CreateEngagementRequestDto {
  clientOrganizationId: number;
  title: string;
  leadPentesterId: number;
  scope?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  testingType?: TestingType;
}

export interface UpdateEngagementRequestDto {
  title: string;
  scope?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: EngagementStatus | null;
  testingType?: TestingType | null;
}

export interface AssignEngagementUserRequestDto {
  userId: number;
  isLead?: boolean;
}

export interface CreateEngagementTaskRequestDto {
  title: string;
  description?: string | null;
  assignedToUserId: number;
  clientAssetIds: number[];
}

export interface UpdateEngagementTaskRequestDto {
  title: string;
  description?: string | null;
}

export interface UpdateEngagementTaskStatusRequestDto {
  status: EngagementTaskStatus;
}
