import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { AppConfig } from '../config/app.config';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { scanApi } from '../api/services/scan.api';
import { Scan, ScanStatus, getScanToolLabel } from '../../domain/models/scan.model';
import { ChainStep, ConsoleEntry, MAX_CONSOLE_ENTRIES, appendEntries, useScanConsoleStore } from '../stores/scan-console.store';

export type { ChainStep, ConsoleEntry, ScanProgress } from '../stores/scan-console.store';

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

const TERMINAL_STATUSES: ScanStatus[] = ['Completed', 'Failed', 'Cancelled'];
// Matches Scan's declared chain length (Naabu -> Nuclei -> Reconftw) with headroom — just a
// sanity cap so a data bug (e.g. an accidental cycle) can't spin this into an infinite walk.
const MAX_CHAIN_HOPS = 10;

// How often buffered live-console lines are applied to the store (ms).
const FLUSH_INTERVAL_MS = 250;

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
// All accumulated state (console entries, live findings, progress, chain steps) lives in
// useScanConsoleStore keyed by the root scan's publicId, not local component state — navigating
// away from the scan detail page and back would otherwise unmount this hook and lose everything
// gathered so far even though the scan itself is still running server-side.
//
// Only reflects forward progress from whichever scan the page loaded on; it doesn't reconstruct
// earlier steps if you land mid-chain (e.g. a bookmarked Nuclei URL after Naabu already
// finished) since Scan has no "previous" pointer, only "next".
export function useScanChainConsole(rootScan: Scan | null | undefined) {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const initSession = useScanConsoleStore((s) => s.initSession);
  const updateSession = useScanConsoleStore((s) => s.updateSession);
  const session = useScanConsoleStore((s) => (rootScan ? s.sessions[rootScan.publicId] : undefined));

  // Resolve the chain and seed the store session — but only the first time this scan is ever
  // opened in this browser session. If a session already exists (e.g. the user navigated away
  // mid-scan and came back), resume from it instead of re-walking and clobbering live progress.
  useEffect(() => {
    if (!rootScan) return;
    if (useScanConsoleStore.getState().sessions[rootScan.publicId]) return;

    let cancelled = false;

    (async () => {
      // Walk the whole chain up front so the progress strip can show every tool immediately —
      // and along the way, work out where live tracking should actually *start*. If the page
      // loads after some prefix of the chain already finished (e.g. clicking in from the list
      // page once Naabu and Nuclei are both done), joining the root scan's SignalR group would
      // wait forever: it's terminal, so no more events will ever arrive for it, and nothing
      // would trigger the handoff to the next step. So skip forward to the first non-terminal
      // step, concatenating each skipped step's persisted rawOutput into the initial entries.
      const resolved: ChainStep[] = [{ id: rootScan.id, publicId: rootScan.publicId, tool: rootScan.tool, toolLabel: rootScan.toolLabel, status: rootScan.status }];
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
          resolved.push({ id: next.id, publicId: next.publicId, tool: next.tool, toolLabel: next.toolLabel, status: next.status });

          if (!foundStart) {
            if (TERMINAL_STATUSES.includes(next.status)) {
              if (next.rawOutput) {
                seeded.push(
                  { kind: 'status', text: `${getScanToolLabel(next.tool, next.toolLabel)} ${next.status.toLowerCase()}` },
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

      // Finished steps' saved output can be very large (reconftw logs): keep only the tail.
      const seededTail = seeded.slice(-MAX_CONSOLE_ENTRIES);
      initSession(rootScan.publicId, {
        steps: resolved,
        entries: seededTail,
        entryOffset: seeded.length - seededTail.length,
        findings: [],
        // foundStart stays false only when every step in the chain is already terminal — in
        // that case fall through to the last step so the console at least shows its final output.
        activePublicId: foundStart ? startPublicId : resolved[resolved.length - 1].publicId,
        findingCounts: {},
        latestPhase: null,
        progress: null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [rootScan, initSession]);

  const rootPublicId = rootScan?.publicId;
  const activePublicId = session?.activePublicId ?? null;

  useEffect(() => {
    if (!activePublicId || !rootPublicId) return;

    // StrictMode double-invokes this effect in dev (mount -> cleanup -> mount), which races the
    // cleanup's connection.stop() against the first mount's in-flight start() and surfaces as
    // "The connection was stopped during negotiation." `cancelled` lets the stale connection's
    // promise chain no-op instead of clobbering state set by the current one.
    let cancelled = false;
    setConnectionError(null);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${getHubBaseUrl()}/hubs/notifications`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken || '',
      })
      .withAutomaticReconnect()
      .build();

    // Lines arrive far faster than React should re-render (thousands per minute from nuclei /
    // reconftw). Buffer them and apply one store update per FLUSH_INTERVAL_MS; updating per line
    // copied the whole history every time and froze the app.
    let buffer: ConsoleEntry[] = [];
    let bufferedFindings = 0;
    let bufferedPhase: string | null = null;
    const flush = () => {
      if (buffer.length === 0 && bufferedPhase === null) return;
      const batch = buffer;
      const findingsInBatch = bufferedFindings;
      const phase = bufferedPhase;
      buffer = [];
      bufferedFindings = 0;
      bufferedPhase = null;
      updateSession(rootPublicId, (prev) => {
        const next = appendEntries(prev, batch);
        return {
          ...next,
          latestPhase: phase ?? next.latestPhase,
          findingCounts: findingsInBatch > 0
            ? { ...next.findingCounts, [activePublicId]: (next.findingCounts[activePublicId] ?? 0) + findingsInBatch }
            : next.findingCounts,
        };
      });
    };
    const flushTimer = window.setInterval(flush, FLUSH_INTERVAL_MS);

    connection.on('ScanOutput', (event: ScanOutputEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;
      buffer.push({ kind: 'raw', text: event.line, stream: event.stream });
    });

    connection.on('ScanPhase', (event: ScanPhaseEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;
      buffer.push({ kind: 'status', text: event.message });
      bufferedPhase = event.message;
    });

    connection.on('ScanFinding', (event: ScanFindingEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;
      buffer.push({ kind: 'finding', title: event.title, severity: event.severity, endpoint: event.endpoint });
      bufferedFindings += 1;
    });

    connection.on('ScanProgress', (event: ScanProgressEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;
      updateSession(rootPublicId, (prev) => ({
        ...prev,
        progress: { percent: event.percent, requests: event.requests, rps: event.rps, matched: event.matched, total: event.total },
      }));
    });

    const applyStatus = (status: ScanStatus) => {
      flush(); // keep buffered output ahead of the status transition

      updateSession(rootPublicId, (prev) => {
        // Idempotent: the same status can arrive both as an event and from the resync below.
        if (prev.steps.find((s) => s.publicId === activePublicId)?.status === status) return prev;
        const steps = prev.steps.map((s) => (s.publicId === activePublicId ? { ...s, status } : s));
        if (!TERMINAL_STATUSES.includes(status)) {
          return { ...prev, steps };
        }

        const idx = steps.findIndex((s) => s.publicId === activePublicId);
        const next = idx >= 0 ? steps[idx + 1] : undefined;
        if (!next) {
          return { ...prev, steps };
        }

        // A new step is starting, so the last-known percent no longer applies to it.
        const message = `${getScanToolLabel(steps[idx].tool, steps[idx].toolLabel)} ${status.toLowerCase()}, starting ${getScanToolLabel(next.tool, next.toolLabel)}`;
        return {
          ...appendEntries(prev, [{ kind: 'status', text: message }]),
          steps,
          latestPhase: message,
          activePublicId: next.publicId,
          progress: null,
        };
      });
    };

    connection.on('ScanStatusChanged', (event: ScanStatusEvent) => {
      if (cancelled || event.scanPublicId !== activePublicId) return;
      applyStatus(event.status as ScanStatus);
    });

    // Group events are not replayed: a status change between loading the scan and joining its
    // group (a queued scan usually starts within a second) was lost, leaving the page on "Queued"
    // while output streamed. After every join, read the status once and apply it.
    const joinAndResync = async () => {
      await connection.invoke('JoinScanGroup', activePublicId);
      const latest = await scanApi.getScanByPublicId(activePublicId);
      if (!cancelled) applyStatus(latest.status);
    };
    // A reconnect gets a new connection id, which is in no group: join again.
    connection.onreconnected(() => {
      joinAndResync().catch(() => undefined);
    });

    connection
      .start()
      .then(joinAndResync)
      .catch((err) => {
        if (!cancelled) {
          setConnectionError(err?.message || 'Failed to connect to the live console.');
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(flushTimer);
      flush();
      connection.invoke('LeaveScanGroup', activePublicId).catch(() => undefined);
      connection.stop();
    };
  }, [activePublicId, rootPublicId, updateSession]);

  return {
    entries: session?.entries ?? [],
    entryOffset: session?.entryOffset ?? 0,
    liveFindings: session?.findings ?? [],
    steps: session?.steps ?? [],
    activePublicId,
    connectionError,
    findingCounts: session?.findingCounts ?? {},
    latestPhase: session?.latestPhase ?? null,
    progress: session?.progress ?? null,
  };
}
