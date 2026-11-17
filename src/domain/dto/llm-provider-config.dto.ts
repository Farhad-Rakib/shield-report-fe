import { LlmEffort, LlmProvider } from '../models/llm-provider-config.model';

export interface CreateLlmProviderConfigurationRequestDto {
  name: string | null;
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string | null;
  effort: LlmEffort | null;
}

// apiKey blank/omitted means "keep the existing encrypted key" — the read model never returns
// a decrypted value for this field to round-trip. The provider itself can't be changed.
export interface UpdateLlmProviderConfigurationRequestDto {
  name: string | null;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string | null;
  effort: LlmEffort | null;
}
