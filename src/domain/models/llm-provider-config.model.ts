export type LlmProvider = 'OpenRouter' | 'Gemini' | 'OpenAi' | 'Anthropic' | 'OpenAiCompatible';

export interface LlmProviderConfiguration {
  id: number;
  name: string;
  provider: LlmProvider;
  apiKeyMasked: string;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxOutputTokens: number;
  promptTemplate: string;
  isActive: boolean;
}

export interface LlmProviderTestResult {
  success: boolean;
  latencyMs: number;
  reply: string | null;
  error: string | null;
}
