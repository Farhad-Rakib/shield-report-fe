import { LlmProvider } from '../models/llm-provider-config.model';

export interface CreateLlmProviderConfigurationRequestDto {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string | null;
}

// apiKey blank/omitted means "keep the existing encrypted key" — the read model never returns
// a decrypted value for this field to round-trip.
export interface UpdateLlmProviderConfigurationRequestDto {
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string | null;
}
