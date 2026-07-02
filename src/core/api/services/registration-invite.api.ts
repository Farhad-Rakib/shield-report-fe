import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { RegistrationInvite, RegistrationInviteValidation } from '../../../domain/models/registration-invite.model';
import { CreateRegistrationInviteRequestDto, CompleteRegistrationByTokenRequestDto } from '../../../domain/dto/registration-invite.dto';

class RegistrationInviteApi extends BaseRepository {
  constructor() {
    super('/registration-invites');
  }

  async getInvites(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<RegistrationInvite>> {
    const res = await this.get<ApiResponse<PaginatedResponse<RegistrationInvite>>>('', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createInvite(dto: CreateRegistrationInviteRequestDto): Promise<RegistrationInvite> {
    const res = await this.post<ApiResponse<RegistrationInvite>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async revokeInvite(id: number): Promise<void> {
    const res = await this.post<ApiResponse<null>>(`/${id}/revoke`);
    if (!res.success) throw new Error(res.message);
  }

  async validateByToken(token: string): Promise<RegistrationInviteValidation> {
    const res = await this.get<ApiResponse<RegistrationInviteValidation>>(`/by-token/${token}`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async completeByToken(token: string, dto: CompleteRegistrationByTokenRequestDto): Promise<void> {
    const res = await this.post<ApiResponse<unknown>>(`/by-token/${token}/complete`, dto);
    if (!res.success) throw new Error(res.message);
  }
}

export const registrationInviteApi = new RegistrationInviteApi();
