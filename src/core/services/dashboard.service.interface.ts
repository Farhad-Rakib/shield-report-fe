import { GetDashboardSummaryResponseDto } from '../../domain/dto/dashboard.dto';
import { DashboardFilterParams } from '../../domain/models/dashboard.model';

export interface IDashboardService {
  getSummary(params?: DashboardFilterParams): Promise<GetDashboardSummaryResponseDto>;
}
