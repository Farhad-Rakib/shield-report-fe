import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { RetestRequest } from '../../../domain/models/retest-request.model';
import { CreateRetestRequestDto, ResolveRetestRequestDto } from '../../../domain/dto/retest-request.dto';

class RetestRequestApi extends BaseRepository {
  constructor() {
    super('/vulnerabilities');
  }

  async getCurrent(vulnerabilityId: number): Promise<RetestRequest | null> {
    const res = await this.get<ApiResponse<RetestRequest | null>>(`/${vulnerabilityId}/retest`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(vulnerabilityId: number, dto: CreateRetestRequestDto): Promise<RetestRequest> {
    const res = await this.post<ApiResponse<RetestRequest>>(`/${vulnerabilityId}/retest`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async resolve(vulnerabilityId: number, dto: ResolveRetestRequestDto): Promise<RetestRequest> {
    const res = await this.patch<ApiResponse<RetestRequest>>(`/${vulnerabilityId}/retest`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const retestRequestApi = new RetestRequestApi();
