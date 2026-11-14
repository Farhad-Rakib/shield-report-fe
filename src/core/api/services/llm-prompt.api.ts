import { BaseRepository } from '../base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { LlmPrompt, LlmPromptTestResult } from '../../../domain/models/llm-prompt.model';

class LlmPromptApi extends BaseRepository {
  constructor() {
    super('/llm-prompts');
  }

  async getAll(): Promise<LlmPrompt[]> {
    const res = await this.get<ApiResponse<LlmPrompt[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async save(key: string, template: string): Promise<LlmPrompt> {
    const res = await this.put<ApiResponse<LlmPrompt>>(`/${key}`, { template });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  async reset(key: string): Promise<LlmPrompt> {
    const res = await this.post<ApiResponse<LlmPrompt>>(`/${key}/reset`, {});
    if (!res.success) throw new Error(res.message);
    return res.data;
  }

  // Sends the prompt (the unsaved template if given) with sample values to the active provider.
  async test(key: string, template: string | null): Promise<LlmPromptTestResult> {
    const res = await this.post<ApiResponse<LlmPromptTestResult>>(`/${key}/test`, { template }, { timeout: 90_000 });
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}

export const llmPromptApi = new LlmPromptApi();
