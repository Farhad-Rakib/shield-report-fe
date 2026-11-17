import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { EmailSettings, UpdateEmailSettings } from '../../../domain/models/email-settings.model';

// Outgoing mail configuration (Administration → Email Configuration).
class EmailSettingsApi extends BaseRepository {
  constructor() {
    super('/email-settings');
  }

  async getSettings(): Promise<EmailSettings> {
    const res = await this.get<ApiResponse<EmailSettings>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(dto: UpdateEmailSettings): Promise<EmailSettings> {
    const res = await this.put<ApiResponse<EmailSettings>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async sendTest(to: string): Promise<string> {
    const res = await this.post<ApiResponse<unknown>>('/test', { to });
    if (!res.success) throw new Error(res.message);
    return res.message;
  }
}

export const emailSettingsApi = new EmailSettingsApi();
