import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { AppConfig } from '../config/app.config';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { scanApi } from '../api/services/scan.api';
import { Scan, ScanStatus, ScanTool } from '../../domain/models/scan.model';

interface ScanOutputEvent {
  scanPublicId: string;
  line: string;
  stream: 'stdout' | 'stderr';
}

interface ScanPhaseEvent {
  scanPublicId: string;
  message: string;
}

interface ScanFindingEvent {
  scanPublicId: string;
  title: string;
  severity: string | null;
  endpoint: string;
}

interface ScanStatusEvent {
  scanPublicId: string;
  status: string;
}

interface ScanProgressEvent {
  scanPublicId: string;
  percent: number;
  requests: number | null;
  rps: number | null;
  matched: number | null;
  total: number | null;
}

export interface ScanProgress {
  percent: number;
  requests: number | null;
  rps: number | null;
  matched: number | null;
  total: number | null;
}

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

const TERMINAL_STATUSES: ScanStatus[] = ['Completed', 'Failed', 'Cancelled'];
// Matches Scan's declared chain length (Naabu -> Nuclei -> Reconftw) with headroom — just a
// sanity cap so a data bug (e.g. an accidental cycle) can't spin this into an infinite walk.
const MAX_CHAIN_HOPS = 10;

// The hub lives outside /api/v1 (it's mapped at /hubs/notifications in Program.cs), so the
// REST API base URL isn't reusable as-is — strip the /api/vN suffix to get the hub's host.
function getHubBaseUrl(): string {
  return AppConfig.api.baseURL.replace(/\/api\/v\d+$/i, '');
}

// Follows a chained scan run (Naabu -> Nuclei -> Reconftw) end to end. On load, walks forward
// through Scan.nextScanPublicId to resolve the *entire* chain up front (so the progress strip
// can show all tools immediately, not just the ones discovered so far), then joins each scan's
// SignalR group in turn — advancing to the next pre-resolved step as soon as the active one
// hits a terminal state, so the console reads as one continuous sequential run instead of
// requiring the user to navigate to each tool's scan page by hand.
//
// Only reflects forward progress from whichever scan the page loaded on; it doesn't reconstruct
// earlier steps if you land mid-chain (e.g. a bookmarked Nuclei URL after Naabu already
// finished) since Scan has no "previous" pointer, only "next".
export function useScanChainConsole(rootScan: Scan | null | undefined) {
  const [steps, setSteps] = useState<ChainStep[]>([]);
  const [activePublicId, setActivePublicId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Per-step live finding counts, keyed by the step's publicId — findings arrive scoped to
  // whichever scan is currently the SignalR-joined "active" one, so the handler below can
  // attribute each one directly without parsing entry text.
  const [findingCounts, setFindingCounts] = useState<Record<string, number>>({});
  const [latestPhase, setLatestPhase] = useState<string | null>(null);
  // Null means "no completion percentage reported for the current step" (Naabu/Reconftw don't
  // report one, and Nuclei hasn't sent its first -stats line yet) — the console falls back to
  // an indeterminate bar in that case rather than showing a stale or fabricated number.
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const rootPublicIdRef = useRef<string | null>(null);

  // (Re)initialize only when a *different* root scan loads — React Query refetches the same
  // scan on window focus etc., and that shouldn't reset an in-progress chain walk to step 1.
  useEffect(() => {
    if (!rootScan || rootScan.publicId === rootPublicIdRef.current) return;
    rootPublicIdRef.current = rootScan.publicId;

    let cancelled = false;
    setEntries([]);
    setFindingCounts({});
    setLatestPhase(null);
    setProgress(null);
    setSteps([{ id: rootScan.id, publicId: rootScan.publicId, tool: rootScan.tool, status: rootScan.status }]);
    setActivePublicId(rootScan.publicId);

    (async () => {
      // Walk the whole chain up front so the progress strip can show every tool immediately —
      // and along the way, work out where live tracking should actually *start*. If the page
      // loads after some prefix of the chain already finished (e.g. clicking in from the list
      // page once Naabu and Nuclei are both done), joining the root scan's SignalR group would
      // wait forever: it's terminal, so no more events will ever arrive for it, and nothing
      // would trigger the handoff to the next step. So skip forward to the first non-terminal
      // step, concatenating each skipped step's persisted rawOutput into the initial entries.
      const resolved: ChainStep[] = [{ id: rootScan.id, publicId: rootScan.publicId, tool: rootScan.tool, status: rootScan.status }];
      const seeded: ConsoleEntry[] = [];
      let startPublicId = rootScan.publicId;
      let foundStart = !TERMINAL_STATUSES.includes(rootScan.status);

      if (!foundStart && rootScan.rawOutput) {
        seeded.push(
          ...rootScan.rawOutput
            .split('\n')
            .filter((line) => line.length > 0)
            .map((text): ConsoleEntry => ({ kind: 'raw', text, stream: 'stdout' }))
        );
      }

      let cursor = rootScan.nextScanPublicId;
      let hops = 0;

      while (cursor && hops < MAX_CHAIN_HOPS) {
        try {
          const next = await scanApi.getScanByPublicId(cursor);
          resolved.push({ id: next.id, publicId: next.publicId, tool: next.tool, status: next.status });

          if (!foundStart) {
            if (TERMINAL_STATUSES.includes(next.status)) {
              if (next.rawOutput) {
                seeded.push(
                  { kind: 'status', text: `${next.tool} ${next.status.toLowerCase()}` },
                  ...next.rawOutput.split('\n').filter((line) => line.length > 0).map((text): ConsoleEntry => ({ kind: 'raw', text, stream: 'stdout' }))
                );
              }
            } else {
              startPublicId = next.publicId;
              foundStart = true;
            }
          }

          cursor = next.nextScanPublicId;
          hops += 1;
        } catch {
          break;
        }
      }

      if (cancelled) return;

      setSteps(resolved);
      setEntries(seeded);
      // foundStart stays false only when every step in the chain is already terminal — in that
      // case fall through to the last step so the console at least shows its final output.
      setActivePublicId(foundStart ? startPublicId : resolved[resolved.length - 1].publicId);
    })();

    return () => {
      cancelled = true;
    };
  }, [rootScan]);

  useEffect(() => {
    if (!activePublicId) return;

    // StrictMode double-invokes this effect in dev (mount -> cleanup -> mount), which races the
    // cleanup's connection.stop() against the first mount's in-flight start() and surfaces as
    // "The connection was stopped during negotiation." `cancelled` lets the stale connection's
    // promise chain no-op instead of clobbering state set by the current one.
    let cancelled = false;
    setConnectionError(null);
    // A new step starting shouldn't keep showing the previous tool's last-known percent.
    setProgress(null);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${getHubBaseUrl()}/hubs/notifications`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken || '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ScanOutput', (event: ScanOutputEvent) => {
      if (!cancelled && event.scanPublicId === activePublicId) {
        setEntries((prev) => [...prev, { kind: 'raw', text: event.line, stream: event.stream }]);
      }
    });

    connection.on('ScanPhase', (event: ScanPhaseEvent) => {
      if (!cancelled && event.scanPublicId === activePublicId) {
        setEntries((prev) => [...prev, { kind: 'status', text: event.message }]);
        setLatestPhase(event.message);
      }
    });

    connection.on('ScanFinding', (event: ScanFindingEvent) => {
      if (!cancelled && event.scanPublicId === activePublicId) {
        setEntries((prev) => [...prev, { kind: 'finding', title: event.title, severity: event.severity, endpoint: event.endpoint }]);
        setFindingCounts((prev) => ({ ...prev, [activePublicId]: (prev[activePublicId] ?? 0) + 1 }));
      }
    });

    connection.on('ScanProgress', (event: ScanProgressEvent) => {
      if (!cancelled && event.scanPublicId === activePublicId) {
        setProgress({ percent: event.percent, requests: event.requests, rps: event.rps, matched: event.matched, total: event.total });
      }
    });

    connection.on('ScanStatusChanged', (event: ScanStatusEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;

      const status = event.status as ScanStatus;
      setSteps((prev) => prev.map((s) => (s.publicId === activePublicId ? { ...s, status } : s)));

      if (!TERMINAL_STATUSES.includes(status)) return;

      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.publicId === activePublicId);
        const next = idx >= 0 ? prev[idx + 1] : undefined;
        if (next) {
          const message = `${prev[idx].tool} ${status.toLowerCase()}, starting ${next.tool}`;
          setEntries((entries) => [...entries, { kind: 'status', text: message }]);
          setLatestPhase(message);
          setActivePublicId(next.publicId);
        }
        return prev;
      });
    });

    connection
      .start()
      .then(() => connection.invoke('JoinScanGroup', activePublicId))
      .catch((err) => {
        if (!cancelled) {
          setConnectionError(err?.message || 'Failed to connect to the live console.');
        }
      });

    return () => {
      cancelled = true;
      connection.invoke('LeaveScanGroup', activePublicId).catch(() => undefined);
      connection.stop();
    };
  }, [activePublicId]);

  return { entries, steps, activePublicId, connectionError, findingCounts, latestPhase, progress };
}
