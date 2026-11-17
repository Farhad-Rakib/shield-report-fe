export type LlmProvider = 'OpenRouter' | 'Gemini' | 'OpenAi' | 'Anthropic' | 'OpenAiCompatible';

// Anthropic only (output_config.effort). null = the model's default.
export type LlmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

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
  effort: LlmEffort | null;
}

export interface LlmProviderTestResult {
  success: boolean;
  latencyMs: number;
  reply: string | null;
  error: string | null;
}
