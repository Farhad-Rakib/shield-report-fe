export const AppConfig = {
  app: {
    name: 'Shield Report',
    version: '1.0.0',
    description: 'Shield Report Admin Panel',
    logo: '/logo.svg',
  },

  api: {
    baseURL: 'https://localhost:5001/api/v1',
    timeout: 30000,
    withCredentials: true,
  },

  auth: {
    tokenKey: 'admin_token',
    storageType: 'localStorage' as 'localStorage' | 'sessionStorage',
    loginPath: '/login',
    defaultRedirect: '/dashboard',
    sessionTimeout: 60 * 60 * 1000,
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
