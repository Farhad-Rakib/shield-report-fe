import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { ScanTool } from '../../../domain/models/scan.model';
import { AvailableScanTool, ReconftwModule, ScanQueueLimits, ScanToolSetting, ScanToolTestResult, UpdateScanQueueLimits, UpdateScanToolSetting } from '../../../domain/models/scan-tool.model';

class ScanToolApi extends BaseRepository {
  constructor() {
    super('/scan-tools');
  }

  // Enabled tools only — use for every tool picker.
  async available(): Promise<AvailableScanTool[]> {
    const res = await this.get<ApiResponse<AvailableScanTool[]>>('/available');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getAll(): Promise<ScanToolSetting[]> {
    const res = await this.get<ApiResponse<ScanToolSetting[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async reconftwModules(): Promise<ReconftwModule[]> {
    const res = await this.get<ApiResponse<ReconftwModule[]>>('/reconftw/modules');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(tool: ScanTool, dto: UpdateScanToolSetting): Promise<ScanToolSetting> {
    const res = await this.put<ApiResponse<ScanToolSetting>>(`/${tool}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async getLimits(): Promise<ScanQueueLimits> {
    const res = await this.get<ApiResponse<ScanQueueLimits>>('/limits');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async updateLimits(dto: UpdateScanQueueLimits): Promise<ScanQueueLimits> {
    const res = await this.put<ApiResponse<ScanQueueLimits>>('/limits', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async test(tool: ScanTool): Promise<ScanToolTestResult> {
    const res = await this.post<ApiResponse<ScanToolTestResult>>(`/${tool}/test`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const scanToolApi = new ScanToolApi();
