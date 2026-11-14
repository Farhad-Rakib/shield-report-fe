/**
 * Mirrors ShieldReport.Application.Security.Permissions (shield-report-be).
 * Keep values in sync with the backend constants — these are the literal
 * strings issued in the JWT `permission` claim.
 */
export const Permissions = {
  UsersRead: 'users.read',
  RolesRead: 'roles.read',
  PermissionsRead: 'permissions.read',
  RolePermissionsRead: 'role-permissions.read',
  UserRolesRead: 'user-roles.read',
  MenusRead: 'menus.read',
  DashboardRead: 'dashboard.read',
  SiteSettingsRead: 'site-settings.read',

  // PentestOps — Client Organizations, Assets & Scans
  ClientsRead: 'clients.read',
  ClientsCreate: 'clients.create',
  ClientsUpdate: 'clients.update',
  ClientsDelete: 'clients.delete',
  ClientAssetsRead: 'client-assets.read',
  ClientAssetsCreate: 'client-assets.create',
  ClientAssetsUpdate: 'client-assets.update',
  ClientAssetsDelete: 'client-assets.delete',
  ClientAssetsAuthorizeForScanning: 'client-assets.authorize-for-scanning',
  // Scan authorization records (approval, evidence, validity window, allowed tools).
  ScanAuthorizationsRead: 'scan-authorizations.read',
  ScanAuthorizationsManage: 'scan-authorizations.manage',
  // Audit trail (data changes + security events).
  AuditLogsRead: 'audit-logs.read',
  // Scan Tools settings page.
  ScanToolsManage: 'scan-tools.manage',
  CustomScanToolsManage: 'custom-scan-tools.manage',
  // Email approved reports to the client; client-portal access to approved reports.
  VulnerabilityReportsSend: 'vulnerability-reports.send',
  ClientReportsRead: 'client-reports.read',
  ScansRead: 'scans.read',
  ScansCreate: 'scans.create',
  ScansCancel: 'scans.cancel',
  VulnerabilitiesRead: 'vulnerabilities.read',
  VulnerabilitiesCreate: 'vulnerabilities.create',
  VulnerabilitiesUpdate: 'vulnerabilities.update',
  VulnerabilitiesDelete: 'vulnerabilities.delete',
  VulnerabilityAttachmentsRead: 'vulnerability-attachments.read',
  VulnerabilityAttachmentsUpload: 'vulnerability-attachments.upload',
  VulnerabilityAttachmentsDelete: 'vulnerability-attachments.delete',
  VulnerabilityRemarksRead: 'vulnerability-remarks.read',
  VulnerabilityRemarksCreate: 'vulnerability-remarks.create',
  RetestRequestsRead: 'retest-requests.read',
  RetestRequestsCreate: 'retest-requests.create',
  RetestRequestsResolve: 'retest-requests.resolve',

  // PentestOps — Engagements (pre-existing backend permissions, no FE pages yet)
  EngagementsRead: 'engagements.read',
  EngagementsCreate: 'engagements.create',
  EngagementsUpdate: 'engagements.update',
  EngagementsDelete: 'engagements.delete',
  EngagementsAssign: 'engagements.assign',

  // Invitation & Registration
  RegistrationInvitesRead: 'registration-invites.read',
  RegistrationInvitesCreate: 'registration-invites.create',
  RegistrationInvitesRevoke: 'registration-invites.revoke',

  // LLM Provider Configuration
  LlmProviderConfigurationsRead: 'llm-provider-configurations.read',
  LlmProviderConfigurationsCreate: 'llm-provider-configurations.create',
  LlmProviderConfigurationsUpdate: 'llm-provider-configurations.update',
  LlmProviderConfigurationsDelete: 'llm-provider-configurations.delete',

  // Vulnerability Reports (White Box Testing PDF generator)
  VulnerabilityReportsRead: 'vulnerability-reports.read',
  VulnerabilityReportsGenerate: 'vulnerability-reports.generate',
  VulnerabilityReportsApprove: 'vulnerability-reports.approve',
  VulnerabilityReportsDownload: 'vulnerability-reports.download',
  VulnerabilityReportsDelete: 'vulnerability-reports.delete',
  ReportTemplatesRead: 'report-templates.read',
  ReportTemplatesCreate: 'report-templates.create',
  ReportTemplatesUpdate: 'report-templates.update',
  ReportTemplatesDelete: 'report-templates.delete',
} as const;
