import { BaseRepository } from '../../api/base.repository';
import { GetDashboardSummaryResponseDto } from '../../../domain/dto/dashboard.dto';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { DashboardFilterParams } from '../../../domain/models/dashboard.model';
import { IDashboardService } from '../dashboard.service.interface';

export class DashboardService extends BaseRepository implements IDashboardService {
  constructor() {
    super('/Dashboard');
  }

  async getSummary(params?: DashboardFilterParams): Promise<GetDashboardSummaryResponseDto> {
    const res = await this.get<ApiResponse<GetDashboardSummaryResponseDto>>('', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}
