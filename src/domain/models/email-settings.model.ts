// Mirrors ShieldReport.Application.EmailSettings DTOs. The SMTP password is never returned;
// hasPassword says whether one is stored.
export interface EmailSettings {
  isConfigured: boolean;
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string;
  updatedAt: string | null;
}

// password: null keeps the stored one, '' clears it, anything else replaces it.
export interface UpdateEmailSettings {
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  password: string | null;
  fromAddress: string;
  fromName: string;
}
