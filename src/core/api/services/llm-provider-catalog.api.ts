import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { LlmProviderCatalogItem, SaveLlmProviderCatalogItemDto } from '../../../domain/models/llm-provider-catalog.model';

class LlmProviderCatalogApi extends BaseRepository {
  constructor() {
    super('/llm-provider-catalog');
  }

  async getAll(): Promise<LlmProviderCatalogItem[]> {
    const res = await this.get<ApiResponse<LlmProviderCatalogItem[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async create(dto: SaveLlmProviderCatalogItemDto): Promise<LlmProviderCatalogItem> {
    const res = await this.post<ApiResponse<LlmProviderCatalogItem>>('', dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async update(id: number, dto: SaveLlmProviderCatalogItemDto): Promise<LlmProviderCatalogItem> {
    const res = await this.put<ApiResponse<LlmProviderCatalogItem>>(`/${id}`, dto);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async remove(id: number): Promise<void> {
    const res = await this.delete<ApiResponse<null>>(`/${id}`);
    if (!res.success) throw new Error(res.message);
  }
}

export const llmProviderCatalogApi = new LlmProviderCatalogApi();
