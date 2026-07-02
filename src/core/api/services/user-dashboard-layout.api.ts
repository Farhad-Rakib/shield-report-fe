import { BaseRepository } from '../base.repository';
import type { ApiResponse } from '../../../domain/dto/auth.dto';

export interface DashboardLayoutDto {
  widgetOrder: string[];
  hiddenWidgets: string[];
}

export interface SaveDashboardLayoutRequest {
  widgetOrder: string[];
  hiddenWidgets: string[];
}

class UserDashboardLayoutApi extends BaseRepository {
  constructor() {
    super('/DashboardLayout');
  }

  async getLayout(): Promise<DashboardLayoutDto | null> {
    const res = await this.get<ApiResponse<DashboardLayoutDto | null>>('');
    if (!res.success) throw new Error(res.message);
    return res.data ?? null;
  }

  async saveLayout(dto: SaveDashboardLayoutRequest): Promise<void> {
    const res = await this.put<ApiResponse<null>>('', dto);
    if (!res.success) throw new Error(res.message);
  }
}

export const userDashboardLayoutApi = new UserDashboardLayoutApi();
