import type { LlmPrompt, ScanToolSetting } from './api';

// Lives outside e2e-results/ so a crashed run's originals survive the next run's report cleanup.
export const SNAPSHOT_FILE = 'e2e/.auth/original-settings.json';

export interface SettingsSnapshot {
  activeProviderId: number | null;
  prompts: LlmPrompt[];
  scanTools: ScanToolSetting[];
}
