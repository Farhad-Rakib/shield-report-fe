import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { CustomScanTool, SaveCustomScanTool } from '../../../domain/models/custom-scan-tool.model';
import { ScanToolTestResult } from '../../../domain/models/scan-tool.model';

class CustomScanToolApi extends BaseRepository {
  constructor() {
    super('/custom-scan-tools');
  }

  async getAll(): Promise<CustomScanTool[]> {
    const res = await this.get<ApiResponse<CustomScanTool[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(dto: SaveCustomScanTool): Promise<CustomScanTool> {
    const res = await this.post<ApiResponse<CustomScanTool>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(id: number, dto: SaveCustomScanTool): Promise<CustomScanTool> {
    const res = await this.put<ApiResponse<CustomScanTool>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async remove(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<unknown>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
  }

  // Pulls the image when missing (can take minutes for big images).
  async test(id: number): Promise<ScanToolTestResult> {
    const res = await this.post<ApiResponse<ScanToolTestResult>>(`/${id}/test`, {}, { timeout: 330_000 });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const customScanToolApi = new CustomScanToolApi();
