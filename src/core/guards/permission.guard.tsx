import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  requireAll?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions,
  requireAll = false,
}) => {
  const { hasAllPermissions, hasAnyPermission, tokenPayload } = useAuthStore();

  // SuperAdmin is seeded with zero explicit RolePermission rows (the backend's
  // PermissionAuthorizationHandler bypasses permission checks for this role at
  // runtime instead), so its JWT carries no `permission` claims. Mirror that
  // bypass here, or SuperAdmin would be locked out of every guarded route.
  const isSuperAdmin =
    tokenPayload?.role === 'SuperAdmin' ||
    tokenPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'SuperAdmin';

  const hasAccess =
    isSuperAdmin ||
    (requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions));

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
