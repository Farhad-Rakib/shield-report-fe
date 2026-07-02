import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { AppConfig } from '../config/app.config';
import { useAuthStore } from '../../features/auth/store/auth.store';

interface ScanOutputEvent {
  scanPublicId: string;
  line: string;
}

interface ScanStatusEvent {
  scanPublicId: string;
  status: string;
}

// The hub lives outside /api/v1 (it's mapped at /hubs/notifications in Program.cs), so the
// REST API base URL isn't reusable as-is — strip the /api/vN suffix to get the hub's host.
function getHubBaseUrl(): string {
  return AppConfig.api.baseURL.replace(/\/api\/v\d+$/i, '');
}

export function useScanConsoleHub(scanPublicId: string | null) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!scanPublicId) return;

    // StrictMode double-invokes this effect in dev (mount -> cleanup -> mount), which races
    // the cleanup's connection.stop() against the first mount's in-flight start() and surfaces
    // as "The connection was stopped during negotiation." `cancelled` lets the stale connection's
    // promise chain no-op instead of clobbering state set by the real, current connection.
    let cancelled = false;
    setLines([]);
    setConnectionError(null);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${getHubBaseUrl()}/hubs/notifications`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken || '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ScanOutput', (event: ScanOutputEvent) => {
      if (!cancelled && event.scanPublicId === scanPublicId) {
        setLines((prev) => [...prev, event.line]);
      }
    });

    connection.on('ScanStatusChanged', (event: ScanStatusEvent) => {
      if (!cancelled && event.scanPublicId === scanPublicId) {
        setStatus(event.status);
      }
    });

    connection
      .start()
      .then(() => connection.invoke('JoinScanGroup', scanPublicId))
      .catch((err) => {
        if (!cancelled) {
          setConnectionError(err?.message || 'Failed to connect to the live console.');
        }
      });

    connectionRef.current = connection;

    return () => {
      cancelled = true;
      connection.invoke('LeaveScanGroup', scanPublicId).catch(() => undefined);
      connection.stop();
      connectionRef.current = null;
    };
  }, [scanPublicId]);

  return { lines, status, connectionError };
}
