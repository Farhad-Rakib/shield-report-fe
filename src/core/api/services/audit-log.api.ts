import { BaseRepository } from '../base.repository';
import { PaginatedResponse } from '../http.types';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { AuditLogEntry, AuditLogQuery } from '../../../domain/models/audit-log.model';

class AuditLogApi extends BaseRepository {
  constructor() {
    super('/audit-logs');
  }

  async search(params: AuditLogQuery): Promise<PaginatedResponse<AuditLogEntry>> {
    const res = await this.get<ApiResponse<PaginatedResponse<AuditLogEntry>>>('', { params });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async entityNames(): Promise<string[]> {
    const res = await this.get<ApiResponse<string[]>>('/entity-names');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const auditLogApi = new AuditLogApi();
