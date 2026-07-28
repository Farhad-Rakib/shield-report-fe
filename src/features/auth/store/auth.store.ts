import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LoginRequestDto } from '../../../domain/dto/auth.dto';
import { authApi } from '../../../core/api/services/auth.api';
import { menuApi } from '../../../core/api/services/menu.api';
import { AppConfig } from '../../../core/config/app.config';
import { queryClient } from '../../../app/providers/AppProviders';

interface TokenPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenPayload: TokenPayload | null;
  login: (dto: LoginRequestDto) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// SuperAdmin gets zero explicit RolePermission rows by design (see RbacSeeder.cs — "SuperAdmin
// bypasses permission checks at runtime; do NOT assign explicit permissions here"), so its JWT's
// permission claim is empty. The backend bypasses via PermissionAuthorizationHandler's own role
// check; mirror that here, or every hasPermission(...)-gated control in the app silently hides
// itself for the one account that's actually allowed to do everything.
//
// A user with more than one role (e.g. SuperAdmin also assigned PENTESTER for test data) gets
// the role claim serialized as an ARRAY, not a single string — a strict `=== 'SuperAdmin'` check
// silently breaks for that shape, hiding every gated control instead of granting everything.
function hasRole(roleClaim: unknown, role: string): boolean {
  if (Array.isArray(roleClaim)) return roleClaim.includes(role);
  return roleClaim === role;
}

function isSuperAdmin(tokenPayload: TokenPayload | null): boolean {
  if (!tokenPayload) return false;
  return (
    hasRole(tokenPayload.role, 'SuperAdmin') ||
    hasRole(tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'], 'SuperAdmin')
  );
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tokenPayload: null,

      login: async (dto: LoginRequestDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(dto);
          const payload = decodeJwtPayload(response.accessToken);

          set({
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            tokenPayload: payload,
          });

          queryClient.prefetchQuery({
            queryKey: ['menu'],
            queryFn: () => menuApi.getMenuItems(),
          });
        } catch (error: any) {
          const message = error?.response?.data?.message || error?.message || 'Login failed';
          set({
            error: message,
            isLoading: false,
            isAuthenticated: false,
          });
          throw new Error(message);
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          queryClient.clear();

          set({
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            tokenPayload: null,
          });

          const storage = AppConfig.auth.storageType === 'localStorage' ? localStorage : sessionStorage;
          storage.removeItem(AppConfig.auth.tokenKey);
        }
      },

      clearError: () => set({ error: null }),

      hasPermission: (permission: string): boolean => {
        const { tokenPayload } = get();
        if (!tokenPayload) return false;
        if (isSuperAdmin(tokenPayload)) return true;
        const perms = tokenPayload.permissions || tokenPayload.permission || [];
        if (Array.isArray(perms)) return perms.includes(permission);
        return false;
      },

      hasAnyPermission: (permissions: string[]): boolean => {
        const { tokenPayload } = get();
        if (!tokenPayload) return false;
        if (isSuperAdmin(tokenPayload)) return true;
        const perms: string[] = tokenPayload.permissions || tokenPayload.permission || [];
        if (!Array.isArray(perms)) return false;
        return permissions.some(p => perms.includes(p));
      },

      hasAllPermissions: (permissions: string[]): boolean => {
        const { tokenPayload } = get();
        if (!tokenPayload) return false;
        if (isSuperAdmin(tokenPayload)) return true;
        const perms: string[] = tokenPayload.permissions || tokenPayload.permission || [];
        if (!Array.isArray(perms)) return false;
        return permissions.every(p => perms.includes(p));
      },
    }),
    {
      name: AppConfig.auth.tokenKey,
      partialize: (state) => ({
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        tokenPayload: state.tokenPayload,
      }),
    }
  )
);
