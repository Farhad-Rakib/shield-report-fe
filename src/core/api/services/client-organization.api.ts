import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { ClientOrganization } from '../../../domain/models/client-organization.model';
import { CreateClientOrganizationRequestDto, UpdateClientOrganizationRequestDto } from '../../../domain/dto/client-organization.dto';

class ClientOrganizationApi extends BaseRepository {
  constructor() {
    super('/client-organizations');
  }

  async getOrganizations(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<ClientOrganization>> {
    const res = await this.get<ApiResponse<PaginatedResponse<ClientOrganization>>>('', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getById(id: number): Promise<ClientOrganization> {
    const res = await this.get<ApiResponse<ClientOrganization>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createOrganization(dto: CreateClientOrganizationRequestDto): Promise<ClientOrganization> {
    const res = await this.post<ApiResponse<ClientOrganization>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateOrganization(id: number, dto: UpdateClientOrganizationRequestDto): Promise<ClientOrganization> {
    const res = await this.put<ApiResponse<ClientOrganization>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async deactivateOrganization(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<null>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
  }
}

export const clientOrganizationApi = new ClientOrganizationApi();
