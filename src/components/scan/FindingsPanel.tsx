import { Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ConsoleEntry } from '../../core/hooks/useScanChainConsole';

type FindingEntry = Extract<ConsoleEntry, { kind: 'finding' }>;

interface FindingsPanelProps {
  findings: FindingEntry[];
}

const SEVERE = new Set(['critical', 'high']);
const WARNING = new Set(['medium']);

type Bucket = 'informational' | 'warning' | 'severe';

function bucketOf(severity: string | null): Bucket {
  const normalized = (severity || '').toLowerCase();
  if (SEVERE.has(normalized)) return 'severe';
  if (WARNING.has(normalized)) return 'warning';
  return 'informational';
}

const BOX_CONFIG: Record<Bucket, { label: string; icon: React.ReactNode; border: string; header: string; badge: string }> = {
  informational: {
    label: 'Informational',
    icon: <Info className="w-4 h-4 text-emerald-400" />,
    border: 'border-emerald-500/30',
    header: 'bg-emerald-500/10 text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
  warning: {
    label: 'Warning',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    border: 'border-amber-500/30',
    header: 'bg-amber-500/10 text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  severe: {
    label: 'Severe',
    icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
    border: 'border-red-500/30',
    header: 'bg-red-500/10 text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
};

// Three fixed severity boxes — findings are sorted into whichever one matches as ScanFinding
// events arrive, rather than rendering one card per finding. Always renders all three so the
// layout doesn't jump around as the first finding of a given severity shows up mid-scan.
export const FindingsPanel: React.FC<FindingsPanelProps> = ({ findings }) => {
  const buckets: Record<Bucket, FindingEntry[]> = { informational: [], warning: [], severe: [] };
  for (const finding of findings) {
    buckets[bucketOf(finding.severity)].push(finding);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {(Object.keys(BOX_CONFIG) as Bucket[]).map((bucket) => {
        const config = BOX_CONFIG[bucket];
        const items = buckets[bucket];
        return (
          <div key={bucket} className={`rounded-lg border ${config.border} bg-slate-900 overflow-hidden flex flex-col`}>
            <div className={`flex items-center gap-1.5 px-3 py-2 ${config.header}`}>
              {config.icon}
              <span className="text-xs font-mono uppercase tracking-wide font-medium">{config.label}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded-full text-xs font-mono ${config.badge}`}>{items.length}</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-xs text-gray-600 px-1 py-2">No findings yet</p>
              ) : (
                items.map((finding, i) => (
                  <div key={i} className="animate-fade-in-up rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                    <p className="text-xs font-medium text-gray-200 leading-snug">{finding.title}</p>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">{finding.endpoint}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
