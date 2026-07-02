import { InviteLifetime } from '../models/registration-invite.model';

export interface CreateRegistrationInviteRequestDto {
  email: string;
  roleId: number;
  clientOrganizationId?: number | null;
  lifetime: InviteLifetime;
}

export interface CompleteRegistrationByTokenRequestDto {
  fullName: string;
  password: string;
}
