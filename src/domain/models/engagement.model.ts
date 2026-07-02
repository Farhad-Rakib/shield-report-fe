export type EngagementStatus = 'Scheduled' | 'InProgress' | 'InReview' | 'Completed';
export type EngagementTaskStatus = 'NotStarted' | 'InProgress' | 'Done';

export interface EngagementAssignee {
  userId: number;
  fullName: string;
  assignedAt: string;
}

// Mirrors ShieldReport.Application.Engagements.Dtos.EngagementDto field-for-field.
export interface Engagement {
  id: number;
  publicId: string;
  clientOrganizationId: number;
  clientOrganizationName: string;
  title: string;
  scope: string | null;
  status: EngagementStatus;
  startDate: string | null;
  endDate: string | null;
  leadPentesterId: number;
  leadPentesterName: string;
  createdByUserId: number;
  assignees: EngagementAssignee[];
}

// Mirrors ShieldReport.Application.Engagements.Dtos.EngagementTaskDto field-for-field.
export interface EngagementTask {
  id: number;
  engagementId: number;
  title: string;
  description: string | null;
  assignedToUserId: number;
  assignedToUserName: string;
  status: EngagementTaskStatus;
  createdByUserId: number;
  clientAssetIds: number[];
}
