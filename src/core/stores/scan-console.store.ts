import { create } from 'zustand';
import { ScanStatus, ScanTool } from '../../domain/models/scan.model';

// One typed entry per console line — lets ScanConsolePane render backend-narrated progress,
// raw tool output, and live parsed findings with distinct treatment instead of one flat text feed.
export type ConsoleEntry =
  | { kind: 'raw'; text: string; stream: 'stdout' | 'stderr' }
  | { kind: 'status'; text: string }
  | { kind: 'finding'; title: string; severity: string | null; endpoint: string };

export interface ChainStep {
  id: number;
  publicId: string;
  tool: ScanTool;
  status: ScanStatus;
}

export interface ScanProgress {
  percent: number;
  requests: number | null;
  rps: number | null;
  matched: number | null;
  total: number | null;
}

export interface ScanConsoleSession {
  steps: ChainStep[];
  activePublicId: string | null;
  entries: ConsoleEntry[];
  findingCounts: Record<string, number>;
  latestPhase: string | null;
  progress: ScanProgress | null;
}

interface ScanConsoleStoreState {
  // Keyed by the *root* scan's publicId (the one in the URL) — not module-persisted, so it
  // survives SPA navigation (component unmount/remount) but intentionally resets on a full page
  // reload, same as every other in-memory Zustand store in this app.
  sessions: Record<string, ScanConsoleSession>;
  initSession: (rootPublicId: string, session: ScanConsoleSession) => void;
  updateSession: (rootPublicId: string, updater: (prev: ScanConsoleSession) => ScanConsoleSession) => void;
}

export const useScanConsoleStore = create<ScanConsoleStoreState>()((set) => ({
  sessions: {},
  initSession: (rootPublicId, session) =>
    set((state) => ({ sessions: { ...state.sessions, [rootPublicId]: session } })),
  updateSession: (rootPublicId, updater) =>
    set((state) => {
      const prev = state.sessions[rootPublicId];
      if (!prev) return state;
      return { sessions: { ...state.sessions, [rootPublicId]: updater(prev) } };
    }),
}));
