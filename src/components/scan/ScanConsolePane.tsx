import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface ScanConsolePaneProps {
  lines: string[];
}

export const ScanConsolePane: React.FC<ScanConsolePaneProps> = ({ lines }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      disableStdin: true,
      fontSize: 13,
      theme: { background: '#0b0f19' },
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
    for (let i = writtenCountRef.current; i < lines.length; i++) {
      terminal.writeln(lines[i]);
    }
    writtenCountRef.current = lines.length;
  }, [lines]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#0b0f19] p-3">
      <div ref={containerRef} className="h-96" />
    </div>
  );
};
