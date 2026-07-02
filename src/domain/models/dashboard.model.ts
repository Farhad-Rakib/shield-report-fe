export interface UsersByRolePoint {
  roleName: string;
  userCount: number;
}

export interface RegistrationTrendPoint {
  month: string;
  count: number;
}

export interface RecentUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface SeverityBreakdownPoint {
  severity: string;
  count: number;
}

export interface EngagementStatusPoint {
  status: string;
  count: number;
}

export interface RecentActivity {
  type: 'Engagement' | 'Scan' | 'Vulnerability';
  title: string;
  clientOrganizationName: string | null;
  status: string | null;
  occurredAt: string;
}

// Mirrors ShieldReport.Application.Dashboard.Dtos.DashboardSummaryDto field-for-field.
export interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  usersByRole: UsersByRolePoint[];
  registrationsTrend: RegistrationTrendPoint[];
  recentUsers: RecentUser[];
  totalClients: number;
  totalEngagements: number;
  totalAssets: number;
  openVulnerabilities: number;
  criticalVulnerabilities: number;
  activeScans: number;
  vulnerabilitiesBySeverity: SeverityBreakdownPoint[];
  engagementsByStatus: EngagementStatusPoint[];
  recentActivity: RecentActivity[];
}

export interface DashboardFilterParams {
  clientOrganizationId?: number;
  from?: string;
  to?: string;
}
