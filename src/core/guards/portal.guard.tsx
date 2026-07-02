import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { AppConfig } from '../config/app.config';

// JWT carries `isClientPortalUser: "true"` only when true (omitted otherwise) — see
// JwtTokenGenerator.cs — so check for the string, not a strict boolean.
export const isClientPortalUser = (tokenPayload: Record<string, unknown> | null): boolean =>
  tokenPayload?.isClientPortalUser === 'true' || tokenPayload?.isClientPortalUser === true;

interface GuardProps {
  children: React.ReactNode;
}

// Gates the /portal/* tree — staff (no isClientPortalUser claim) get bounced to the admin dashboard.
export const PortalGuard: React.FC<GuardProps> = ({ children }) => {
  const tokenPayload = useAuthStore((s) => s.tokenPayload);

  if (!isClientPortalUser(tokenPayload)) {
    return <Navigate to={AppConfig.auth.defaultRedirect} replace />;
  }

  return <>{children}</>;
};

// Gates the staff console — client-portal users have read access to some of the same
// permissions (ClientAssetsRead, VulnerabilitiesRead, etc.) for API scoping reasons, but
// should never land on the admin UI itself. Redirect them into their own portal instead.
export const StaffGuard: React.FC<GuardProps> = ({ children }) => {
  const tokenPayload = useAuthStore((s) => s.tokenPayload);

  if (isClientPortalUser(tokenPayload)) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};
