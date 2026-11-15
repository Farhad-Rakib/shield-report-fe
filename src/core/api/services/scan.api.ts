import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { Scan, ScanFindingRaw } from '../../../domain/models/scan.model';
import { CreateScanRequestDto } from '../../../domain/dto/scan.dto';
import { ListFilterQuery } from '../../../domain/dto/list-filter.dto';

class ScanApi extends BaseRepository {
  constructor() {
    super('');
  }

  async getScans(params?: ListFilterQuery & { engagementId?: number; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Scan>> {
    const res = await this.get<ApiResponse<PaginatedResponse<Scan>>>('/scans', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getScanByPublicId(publicId: string): Promise<Scan> {
    const res = await this.get<ApiResponse<Scan>>(`/scans/${publicId}`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async createScan(assetId: number, dto: CreateScanRequestDto): Promise<Scan[]> {
    const res = await this.post<ApiResponse<Scan[]>>(`/assets/${assetId}/scans`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async cancelScan(publicId: string): Promise<Scan> {
    const res = await this.post<ApiResponse<Scan>>(`/scans/${publicId}/cancel`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getRawFindings(publicId: string): Promise<ScanFindingRaw[]> {
    const res = await this.get<ApiResponse<ScanFindingRaw[]>>(`/scans/${publicId}/raw-findings`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const scanApi = new ScanApi();
