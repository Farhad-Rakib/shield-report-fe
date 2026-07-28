export type LlmProvider = 'OpenRouter' | 'Gemini' | 'OpenAi';

export interface LlmProviderConfiguration {
  id: number;
  provider: LlmProvider;
  apiKeyMasked: string;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string;
  isActive: boolean;
}
