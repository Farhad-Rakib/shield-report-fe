import { BaseRepository } from '../base.repository';
import type { ApiResponse } from '../../../domain/dto/auth.dto';
import type { GetFindingsReportRequestDto, GetFindingsReportResponseDto } from '../../../domain/dto/findings-report.dto';

class FindingsReportApi extends BaseRepository {
  constructor() {
    super('/findings-report');
  }

  async getReport(params: GetFindingsReportRequestDto): Promise<GetFindingsReportResponseDto> {
    const res = await this.get<ApiResponse<GetFindingsReportResponseDto>>('', { params: { ...params } });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const findingsReportApi = new FindingsReportApi();
