import { useEffect, useState } from 'react';
import { Shield, Lock, Bug, Terminal as TerminalIcon, Radar, ServerCog, Eye, ShieldCheck } from 'lucide-react';

const TERMINAL_LINES = [
  { text: '$ naabu -host target.com -p 1-1000', tone: 'text-gray-400' },
  { text: '[INFO] 4 open ports discovered', tone: 'text-blue-400' },
  { text: '$ nuclei -u target.com -severity critical,high', tone: 'text-gray-400' },
  { text: '[CRITICAL] SQL injection in /login.php', tone: 'text-red-400' },
  { text: '[HIGH] Reflected XSS in /search', tone: 'text-orange-400' },
  { text: '$ vulnerability triage --auto-dedupe', tone: 'text-gray-400' },
  { text: '✓ 2 findings created and CVSS-scored', tone: 'text-emerald-400' },
];

const FLOATING_ICONS = [
  { Icon: Shield, top: '10%', left: '12%', size: 28, delay: '0s' },
  { Icon: Lock, top: '20%', left: '78%', size: 22, delay: '0.6s' },
  { Icon: Bug, top: '68%', left: '15%', size: 26, delay: '1.2s' },
  { Icon: TerminalIcon, top: '78%', left: '70%', size: 24, delay: '0.3s' },
  { Icon: ServerCog, top: '40%', left: '85%', size: 22, delay: '1.8s' },
  { Icon: Eye, top: '52%', left: '6%', size: 20, delay: '0.9s' },
];

export const SecurityShowcasePanel: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= TERMINAL_LINES.length) {
      const resetTimer = setTimeout(() => setVisibleCount(0), 2200);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 700);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {FLOATING_ICONS.map(({ Icon, top, left, size, delay }, idx) => (
        <div
          key={idx}
          className="absolute animate-float text-blue-400/30"
          style={{ top, left, animationDelay: delay }}
        >
          <Icon size={size} />
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
        <div className="relative w-40 h-40 mb-8">
          <div className="absolute inset-0 rounded-full border border-blue-500/30" />
          <div className="absolute inset-4 rounded-full border border-blue-500/20" />
          <div className="absolute inset-8 rounded-full border border-blue-500/10" />
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 animate-radar-sweep origin-center"
              style={{
                background: 'conic-gradient(from 0deg, rgba(59,130,246,0.5), transparent 35%)',
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <span className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-blue-400 animate-ping" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Offensive security, centralized</h2>
        <p className="text-blue-200/70 text-sm max-w-sm mb-8">
          Scope engagements, dispatch scans, triage findings, and report to clients — all in one platform.
        </p>

        <div className="w-full max-w-sm rounded-lg bg-black/40 border border-blue-500/20 backdrop-blur-sm shadow-2xl text-left overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-gray-400 font-mono">scan-console</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5 min-h-[180px]">
            {TERMINAL_LINES.slice(0, visibleCount).map((line, idx) => (
              <p key={idx} className={`${line.tone} animate-fade-in-up`}>{line.text}</p>
            ))}
            {visibleCount < TERMINAL_LINES.length && (
              <span className="inline-block w-1.5 h-3 bg-blue-400 animate-blink align-middle" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-8 text-blue-200/60">
          <div className="flex items-center gap-1.5 text-xs">
            <Radar className="w-3.5 h-3.5" /> Live scan console
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Bug className="w-3.5 h-3.5" /> Auto-deduped findings
          </div>
        </div>
      </div>
    </div>
  );
};
