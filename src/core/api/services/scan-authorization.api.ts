import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { CreateScanAuthorizationRequest, ScanAuthorization } from '../../../domain/models/scan-authorization.model';

// Direct BaseRepository (no factory entry), same convention as site-settings.api.ts.
class ScanAuthorizationApi extends BaseRepository {
  constructor() {
    super('');
  }

  async list(assetId: number): Promise<ScanAuthorization[]> {
    const res = await this.get<ApiResponse<ScanAuthorization[]>>(`/assets/${assetId}/scan-authorizations`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(assetId: number, dto: CreateScanAuthorizationRequest): Promise<ScanAuthorization> {
    const res = await this.post<ApiResponse<ScanAuthorization>>(`/assets/${assetId}/scan-authorizations`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async revoke(id: number, reason: string): Promise<ScanAuthorization> {
    const res = await this.post<ApiResponse<ScanAuthorization>>(`/scan-authorizations/${id}/revoke`, { reason });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async downloadEvidence(id: number): Promise<Blob> {
    const response = await this.client.get(`/scan-authorizations/${id}/evidence`, { responseType: 'blob' });
    return response.data;
  }
}

// Separate instance with a multipart default: with a JSON default content type, axios would
// serialize the FormData body to JSON instead of sending the file.
class ScanAuthorizationEvidenceApi extends BaseRepository {
  constructor() {
    super('', 'multipart/form-data');
  }

  async upload(id: number, file: File): Promise<ScanAuthorization> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this.post<ApiResponse<ScanAuthorization>>(`/scan-authorizations/${id}/evidence`, formData);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const scanAuthorizationApi = new ScanAuthorizationApi();
export const scanAuthorizationEvidenceApi = new ScanAuthorizationEvidenceApi();
