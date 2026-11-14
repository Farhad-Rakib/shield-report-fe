import { useEffect, useState } from 'react';
import { Radar, FileCheck2, Bug } from 'lucide-react';
import { TerminalWindow } from '../../../components/ui/TerminalWindow/TerminalWindow';
import { BrandMark } from './BrandMark';

// Mock console lines only; no real tool names are shown (clients may see this screen).
const LINES = [
  { text: '$ engagement open --client acme --scope 3 assets', tone: 'text-gray-400' },
  { text: '[info]  port discovery: 14 open services', tone: 'text-sky-400' },
  { text: '$ scan run --profile web --target app.acme.io', tone: 'text-gray-400' },
  { text: '[crit]  SQL injection: POST /api/login (CVSS 9.8)', tone: 'text-red-400' },
  { text: '[high]  Stored XSS: /comments (CVSS 7.4)', tone: 'text-orange-400' },
  { text: '[med]   Missing HSTS header on 2 hosts', tone: 'text-amber-400' },
  { text: '$ report build --template white-box', tone: 'text-gray-400' },
  { text: '✓ report ready: SR-2026-0142.pdf', tone: 'text-emerald-400' },
];

const FEATURES = [
  { Icon: Radar, label: 'Recon and scanning', hint: 'Queued, isolated scanner runs' },
  { Icon: Bug, label: 'Findings triage', hint: 'CVSS 3.1 scoring and dedupe' },
  { Icon: FileCheck2, label: 'Client-ready reports', hint: 'Templated, versioned output' },
];

/** Left half of the sign-in screen: brand, product pitch and an animated console. */
export const AuthConsolePanel: React.FC = () => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const done = visible >= LINES.length;
    const t = setTimeout(() => setVisible(done ? 0 : visible + 1), done ? 2400 : 650);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="relative hidden lg:flex lg:w-[46%] xl:w-1/2 min-h-screen overflow-hidden bg-console text-gray-300">
      {/* Fine grid + accent glow */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col w-full px-12 xl:px-16 py-10">
        <BrandMark />

        <div className="my-auto max-w-lg">
          <p className="text-2xs font-mono uppercase tracking-[0.16em] text-brand-400 mb-3">Penetration testing operations</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white leading-tight">
            From scope to signed-off report, in one console.
          </h2>
          <p className="mt-3 text-sm text-gray-400 leading-relaxed">
            Plan engagements, run scans, triage findings and deliver reports your clients can act on.
          </p>

          <TerminalWindow title="pentestops — session" live className="mt-8 border-console-border bg-black/50">
            <div className="p-4 font-mono text-xs leading-6 h-[216px] overflow-hidden">
              {LINES.slice(0, visible).map((l, i) => (
                <div key={i} className={`${l.tone} whitespace-nowrap animate-fade-in-up`}>
                  {l.text}
                </div>
              ))}
              <span className="inline-block w-2 h-4 align-middle bg-brand-400 animate-blink" />
            </div>
          </TerminalWindow>

          <ul className="mt-8 grid grid-cols-3 gap-3">
            {FEATURES.map(({ Icon, label, hint }) => (
              <li key={label} className="rounded-md border border-console-border bg-console-raised/60 p-3">
                <Icon className="w-4 h-4 text-brand-400 mb-2" />
                <p className="text-xs font-medium text-gray-200">{label}</p>
                <p className="text-2xs text-gray-500 mt-0.5">{hint}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs text-gray-600 font-mono">Authorized use only. Activity is logged.</p>
      </div>
    </div>
  );
};
