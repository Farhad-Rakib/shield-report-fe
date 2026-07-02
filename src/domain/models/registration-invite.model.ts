export type InviteLifetime = 'TwentyFourHours' | 'SevenDays' | 'ThirtyDays';
export type InviteStatus = 'Pending' | 'Consumed' | 'Revoked' | 'Expired';

export interface RegistrationInvite {
  id: number;
  email: string;
  roleName: string;
  clientOrganizationId: number | null;
  clientOrganizationName: string | null;
  expiresAtUtc: string;
  consumedAtUtc: string | null;
  revokedAtUtc: string | null;
  status: InviteStatus;
  token: string | null;
}

export interface RegistrationInviteValidation {
  email: string;
  roleName: string;
  clientOrganizationName: string | null;
}
