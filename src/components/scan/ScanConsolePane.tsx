import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalWindow } from '../ui/TerminalWindow/TerminalWindow';
import { ConsoleEntry } from '../../core/hooks/useScanChainConsole';

interface ScanConsolePaneProps {
  entries: ConsoleEntry[];
  // Entries already dropped from the front of `entries` (store trimming); 0 when untrimmed.
  entryOffset?: number;
  activeTool?: string;
  live?: boolean;
}

const ANSI_RESET = '\x1b[0m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_DIM = '\x1b[2m';
const ANSI_RED = '\x1b[31m';
const ANSI_ORANGE = '\x1b[33m';
const ANSI_YELLOW = '\x1b[93m';
const ANSI_GREEN = '\x1b[32m';

function severityColor(severity: string | null): string {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return ANSI_RED;
    case 'medium':
      return ANSI_ORANGE;
    case 'low':
      return ANSI_YELLOW;
    default:
      return ANSI_GREEN;
  }
}

function renderEntry(entry: ConsoleEntry): string {
  switch (entry.kind) {
    case 'status':
      return `${ANSI_CYAN}› ${entry.text}${ANSI_RESET}`;
    case 'finding':
      return `${severityColor(entry.severity)}⚡ FOUND [${entry.severity ?? 'info'}] ${entry.title} — ${entry.endpoint}${ANSI_RESET}`;
    case 'raw':
      return entry.stream === 'stderr' ? `${ANSI_DIM}${entry.text}${ANSI_RESET}` : entry.text;
  }
}

export const ScanConsolePane: React.FC<ScanConsolePaneProps> = ({ entries, entryOffset = 0, activeTool, live = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      scrollback: 5000,
      disableStdin: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: { background: '#0b0f19', cursor: '#22d3ee' },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    writtenCountRef.current = 0;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    // writtenCountRef is an absolute line number; entries may have been trimmed from the front.
    const total = entryOffset + entries.length;
    const start = Math.max(writtenCountRef.current, entryOffset);
    if (start >= total) return;
    // One write call for the whole batch instead of one per line.
    const lines: string[] = [];
    for (let i = start; i < total; i++) {
      lines.push(renderEntry(entries[i - entryOffset]));
    }
    terminal.write(lines.join('\r\n') + '\r\n');
    writtenCountRef.current = total;
  }, [entries, entryOffset]);

  return (
    <TerminalWindow title={`scan-console${activeTool ? ` — ${activeTool}` : ''}`} live={live}>
      <div ref={containerRef} className="h-96 p-1" />
    </TerminalWindow>
  );
};
