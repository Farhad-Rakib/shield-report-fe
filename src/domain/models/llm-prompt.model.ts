export interface LlmPromptPlaceholder {
  name: string;
  description: string;
  sampleValue: string;
}

export interface LlmPrompt {
  key: string;
  name: string;
  description: string;
  template: string;
  defaultTemplate: string;
  isCustomized: boolean;
  placeholders: LlmPromptPlaceholder[];
  requiredPlaceholders: string[];
  expectedJsonFields: string[];
  updatedAt: string | null;
}

export interface LlmPromptTestResult {
  success: boolean;
  latencyMs: number;
  renderedPrompt: string;
  reply: string | null;
  replyIsValidJson: boolean;
  error: string | null;
  providerName: string | null;
}
