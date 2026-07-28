import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PortalShellLayout } from '../layouts/PortalShellLayout';
import { AuthGuard } from '../../core/guards/auth.guard';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { PortalGuard, StaffGuard } from '../../core/guards/portal.guard';
import { Permissions } from '../../core/constants/permissions';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { AcceptInvitePage } from '../../features/registration-invites/pages/AcceptInvitePage';
import { InviteUsersPage } from '../../features/registration-invites/pages/InviteUsersPage';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { UsersPage } from '../../features/users/pages/UsersPage';
import { RolesPage } from '../../features/roles/pages/RolesPage';
import { PermissionsPage } from '../../features/permissions/pages/PermissionsPage';
import { RolePermissionsPage } from '../../features/role-permissions/pages/RolePermissionsPage';
import { UserRolesPage } from '../../features/user-roles/pages/UserRolesPage';
import { MenuPage } from '../../features/menu/pages/MenuPage';
import { PreferencesPage } from '../../features/preferences/pages/PreferencesPage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';
import { SiteSettingsPage } from '../../features/site-settings/pages/SiteSettingsPage';
import { LlmConfigurationPage } from '../../features/llm-configuration/pages/LlmConfigurationPage';
import { ReportTemplatesPage } from '../../features/report-templates/pages/ReportTemplatesPage';
import { ClientOrganizationsPage } from '../../features/client-organizations/pages/ClientOrganizationsPage';
import { ClientAssetsPage } from '../../features/client-assets/pages/ClientAssetsPage';
import { ScansListPage } from '../../features/scans/pages/ScansListPage';
import { ScanDetailPage } from '../../features/scans/pages/ScanDetailPage';
import { EngagementsListPage } from '../../features/engagements/pages/EngagementsListPage';
import { EngagementDetailPage } from '../../features/engagements/pages/EngagementDetailPage';
import { VulnerabilitiesListPage } from '../../features/vulnerabilities/pages/VulnerabilitiesListPage';
import { VulnerabilityCreatePage } from '../../features/vulnerabilities/pages/VulnerabilityCreatePage';
import { VulnerabilityDetailPage } from '../../features/vulnerabilities/pages/VulnerabilityDetailPage';
import { PortalEngagementsPage } from '../../features/portal/pages/PortalEngagementsPage';
import { PortalAssetsPage } from '../../features/portal/pages/PortalAssetsPage';
import { PortalVulnerabilitiesPage } from '../../features/portal/pages/PortalVulnerabilitiesPage';
import { PortalVulnerabilityDetailPage } from '../../features/portal/pages/PortalVulnerabilityDetailPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register/:token', element: <AcceptInvitePage /> },
    ],
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <StaffGuard>
          <DashboardLayout />
        </StaffGuard>
      </AuthGuard>
    ),
    children: [
      {
        path: 'dashboard',
        element: (
          <PermissionGuard permissions={[Permissions.DashboardRead]}>
            <DashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'users',
        element: (
          <PermissionGuard permissions={[Permissions.UsersRead]}>
            <UsersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'roles',
        element: (
          <PermissionGuard permissions={[Permissions.RolesRead]}>
            <RolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'permissions',
        element: (
          <PermissionGuard permissions={[Permissions.PermissionsRead]}>
            <PermissionsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'roles/permissions',
        element: (
          <PermissionGuard permissions={[Permissions.RolePermissionsRead]}>
            <RolePermissionsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'users/roles',
        element: (
          <PermissionGuard permissions={[Permissions.UserRolesRead]}>
            <UserRolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'menu-management',
        element: (
          <PermissionGuard permissions={[Permissions.MenusRead]}>
            <MenuPage />
          </PermissionGuard>
        ),
      },
      // Personal pages — every authenticated user manages their own profile/preferences,
      // so these are gated by AuthGuard only, not a permission.
      { path: 'preferences', element: <PreferencesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'site-settings',
        element: (
          <PermissionGuard permissions={[Permissions.SiteSettingsRead]}>
            <SiteSettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'registration-invites',
        element: (
          <PermissionGuard permissions={[Permissions.RegistrationInvitesRead]}>
            <InviteUsersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'llm-providers',
        element: (
          <PermissionGuard permissions={[Permissions.LlmProviderConfigurationsRead]}>
            <LlmConfigurationPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'report-templates',
        element: (
          <PermissionGuard permissions={[Permissions.ReportTemplatesRead]}>
            <ReportTemplatesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'clients',
        element: (
          <PermissionGuard permissions={[Permissions.ClientsRead]}>
            <ClientOrganizationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'assets',
        element: (
          <PermissionGuard permissions={[Permissions.ClientAssetsRead]}>
            <ClientAssetsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'scans',
        element: (
          <PermissionGuard permissions={[Permissions.ScansRead]}>
            <ScansListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'scans/:publicId',
        element: (
          <PermissionGuard permissions={[Permissions.ScansRead]}>
            <ScanDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'engagements',
        element: (
          <PermissionGuard permissions={[Permissions.EngagementsRead]}>
            <EngagementsListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'engagements/:id',
        element: (
          <PermissionGuard permissions={[Permissions.EngagementsRead]}>
            <EngagementDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'vulnerabilities',
        element: (
          <PermissionGuard permissions={[Permissions.VulnerabilitiesRead]}>
            <VulnerabilitiesListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'vulnerabilities/new',
        element: (
          <PermissionGuard permissions={[Permissions.VulnerabilitiesRead]}>
            <VulnerabilityCreatePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'vulnerabilities/:id',
        element: (
          <PermissionGuard permissions={[Permissions.VulnerabilitiesRead]}>
            <VulnerabilityDetailPage />
          </PermissionGuard>
        ),
      },
    ],
  },
  {
    path: '/portal',
    element: (
      <AuthGuard>
        <PortalGuard>
          <PortalShellLayout />
        </PortalGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/portal/engagements" replace /> },
      { path: 'engagements', element: <PortalEngagementsPage /> },
      { path: 'assets', element: <PortalAssetsPage /> },
      { path: 'vulnerabilities', element: <PortalVulnerabilitiesPage /> },
      { path: 'vulnerabilities/:id', element: <PortalVulnerabilityDetailPage /> },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
