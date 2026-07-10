import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { ConsoleEntry } from '../../core/hooks/useScanChainConsole';

type FindingEntry = Extract<ConsoleEntry, { kind: 'finding' }>;

interface FindingsPanelProps {
  findings: FindingEntry[];
}

const SEVERE = new Set(['critical', 'high']);

function severityStyle(severity: string | null): { border: string; icon: React.ReactNode; label: string } {
  const normalized = (severity || '').toLowerCase();
  if (SEVERE.has(normalized)) {
    return { border: 'border-t-red-500', icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500" />, label: severity || 'High' };
  }
  if (normalized === 'medium') {
    return { border: 'border-t-amber-500', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, label: severity || 'Medium' };
  }
  return { border: 'border-t-emerald-500', icon: <Info className="w-3.5 h-3.5 text-emerald-500" />, label: severity || 'Info' };
}

// Live results feed, parsed straight from the streaming console — appears above the terminal so
// "what we found" reads at a glance without scrolling raw output. Informational findings get a
// green top border, severe (critical/high) ones red, medium amber — new cards animate in as
// ScanFinding events arrive so the panel visibly grows during a run.
export const FindingsPanel: React.FC<FindingsPanelProps> = ({ findings }) => {
  if (findings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {findings.map((finding, i) => {
        const style = severityStyle(finding.severity);
        return (
          <div
            key={i}
            className={`animate-fade-in-up flex-1 min-w-[240px] max-w-sm rounded-md border-t-4 ${style.border} border-x border-b border-slate-800 bg-slate-900 px-3 py-2.5 shadow-lg`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {style.icon}
              <span className="text-xs font-mono uppercase tracking-wide text-gray-400">{style.label}</span>
            </div>
            <p className="text-sm font-medium text-gray-100 leading-snug">{finding.title}</p>
            <p className="text-xs font-mono text-gray-500 mt-1 truncate">{finding.endpoint}</p>
          </div>
        );
      })}
    </div>
  );
};
