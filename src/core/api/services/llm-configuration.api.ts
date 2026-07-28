import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { LlmProviderConfiguration } from '../../../domain/models/llm-provider-config.model';
import { CreateLlmProviderConfigurationRequestDto, UpdateLlmProviderConfigurationRequestDto } from '../../../domain/dto/llm-provider-config.dto';

class LlmConfigurationApi extends BaseRepository {
  constructor() {
    super('/LlmProviderConfigurations');
  }

  async getAll(): Promise<LlmProviderConfiguration[]> {
    const res = await this.get<ApiResponse<LlmProviderConfiguration[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(dto: CreateLlmProviderConfigurationRequestDto): Promise<LlmProviderConfiguration> {
    const res = await this.post<ApiResponse<LlmProviderConfiguration>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(id: number, dto: UpdateLlmProviderConfigurationRequestDto): Promise<LlmProviderConfiguration> {
    const res = await this.put<ApiResponse<LlmProviderConfiguration>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async remove(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<any>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
  }

  async activate(id: number): Promise<LlmProviderConfiguration> {
    const res = await this.post<ApiResponse<LlmProviderConfiguration>>(`/${id}/activate`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const llmConfigurationApi = new LlmConfigurationApi();
