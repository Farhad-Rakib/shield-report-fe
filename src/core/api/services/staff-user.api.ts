import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';

// Lightweight user lookup shared by pages that need a staff picker (e.g. "Assign Pentester").
// Mirrors the inline UsersApi shape already used by UsersPage — kept separate from
// core/services/impl/user.service.ts, which targets a different (unused) paginated contract.
export interface StaffUser {
  id: number;
  fullName: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

class StaffUserApi extends BaseRepository {
  constructor() {
    super('/Users');
  }

  async getAll(): Promise<StaffUser[]> {
    const res = await this.get<ApiResponse<StaffUser[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const staffUserApi = new StaffUserApi();
