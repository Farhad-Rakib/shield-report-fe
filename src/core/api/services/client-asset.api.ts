import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { ClientAsset } from '../../../domain/models/client-asset.model';
import { ClientAssetListQuery, CreateClientAssetRequestDto, UpdateClientAssetRequestDto } from '../../../domain/dto/client-asset.dto';

class ClientAssetApi extends BaseRepository {
  constructor() {
    super('');
  }

  /** All assets the caller can see, across clients (GET /assets). */
  async getAssets(params?: ClientAssetListQuery): Promise<PaginatedResponse<ClientAsset>> {
    const res = await this.get<ApiResponse<PaginatedResponse<ClientAsset>>>('/assets', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getAssetsForClient(clientOrganizationId: number, params?: Omit<ClientAssetListQuery, 'clientOrganizationId'>): Promise<PaginatedResponse<ClientAsset>> {
    const res = await this.get<ApiResponse<PaginatedResponse<ClientAsset>>>(`/clients/${clientOrganizationId}/assets`, { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createAsset(clientOrganizationId: number, dto: CreateClientAssetRequestDto): Promise<ClientAsset> {
    const res = await this.post<ApiResponse<ClientAsset>>(`/clients/${clientOrganizationId}/assets`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateAsset(assetId: number, dto: UpdateClientAssetRequestDto): Promise<ClientAsset> {
    const res = await this.put<ApiResponse<ClientAsset>>(`/assets/${assetId}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const clientAssetApi = new ClientAssetApi();
