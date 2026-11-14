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
  // Client-facing label from the API (a custom tool's own label; never the internal tool name).
  toolLabel?: string | null;
  status: ScanStatus;
}

export interface ScanProgress {
  percent: number;
  requests: number | null;
  rps: number | null;
  matched: number | null;
  total: number | null;
}

export type FindingEntry = Extract<ConsoleEntry, { kind: 'finding' }>;

// Memory caps. Scans can emit tens of thousands of lines; keeping (and copying) all of them made
// the page — and with it the whole SPA — freeze. The terminal keeps its own scrollback.
export const MAX_CONSOLE_ENTRIES = 2000;
export const MAX_LIVE_FINDINGS = 1000;

export interface ScanConsoleSession {
  steps: ChainStep[];
  activePublicId: string | null;
  entries: ConsoleEntry[];
  // Number of older entries dropped from the front of `entries` (so the console pane can keep an
  // absolute line counter and only write genuinely new lines).
  entryOffset: number;
  // Live findings kept separately so trimming console lines never loses them.
  findings: FindingEntry[];
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

// Appends a batch of entries in one immutable update, collecting findings and trimming the
// oldest console lines beyond MAX_CONSOLE_ENTRIES.
export function appendEntries(prev: ScanConsoleSession, batch: ConsoleEntry[]): ScanConsoleSession {
  if (batch.length === 0) return prev;
  const combined = prev.entries.concat(batch);
  const overflow = Math.max(0, combined.length - MAX_CONSOLE_ENTRIES);
  const newFindings = batch.filter((e): e is FindingEntry => e.kind === 'finding');
  const findings = newFindings.length === 0 ? prev.findings : prev.findings.concat(newFindings).slice(-MAX_LIVE_FINDINGS);
  return {
    ...prev,
    entries: overflow > 0 ? combined.slice(overflow) : combined,
    entryOffset: prev.entryOffset + overflow,
    findings,
  };
}
