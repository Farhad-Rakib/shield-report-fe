// Populated at container startup (see shield-report-fe/docker/entrypoint.sh) so a single built
// image can be pointed at whatever host:port it's deployed behind, without rebuilding.
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { API_BASE_URL?: string };
  }
}

const runtimeApiBaseUrl =
  (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.API_BASE_URL) || undefined;

export const AppConfig = {
  app: {
    name: 'Shield Report',
    version: '1.0.0',
    description: 'Shield Report Admin Panel',
    logo: '/logo.svg',
  },

  api: {
    baseURL: runtimeApiBaseUrl || import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001/api/v1',
    timeout: 30000,
    withCredentials: true,
  },

  auth: {
    tokenKey: 'admin_token',
    storageType: 'localStorage' as 'localStorage' | 'sessionStorage',
    loginPath: '/login',
    defaultRedirect: '/dashboard',
    sessionTimeout: 60 * 60 * 1000,
    // Routes that work without a session — a 401 encountered here (e.g. AuthLayout's
    // pre-login SiteSettings fetch) must never trigger BaseRepository's hard redirect,
    // or the page a visitor is actually trying to use gets yanked out from under them.
    publicPaths: ['/login', '/register'],
  },

  theme: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },

  features: {
    enableNotifications: true,
    enableDarkMode: true,
    enableMultiLanguage: false,
    enableRBAC: true,
  },

  dashboard: {
    autoSave: false,       // true = save automatically after autoSaveDelayMs; false = require Save button click
    autoSaveDelayMs: 800,
  },

  table: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50, 100],
    showPagination: true,
    showSearch: true,
  },

  form: {
    showRequiredIndicator: true,
    validateOnBlur: true,
    validateOnChange: false,
  },

  toast: {
    position: 'top-right' as const,
    duration: 3000,
    maxToasts: 5,
  },
} as const;

export type AppConfigType = typeof AppConfig;
