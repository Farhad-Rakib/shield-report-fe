import { ScanProgress } from '../../core/hooks/useScanChainConsole';

interface ScanProgressBarProps {
  progress: ScanProgress | null;
  active: boolean;
}

// Determinate when the running tool reports a real completion percentage (currently only
// Nuclei, via its own -stats output) — indeterminate sweep otherwise, so a tool with no such
// metric (Naabu, Reconftw) still visibly reads as "in progress" instead of a static empty bar.
export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ progress, active }) => {
  if (!active) return null;

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        {progress ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-indeterminate" />
        )}
      </div>
      {progress && (
        <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
          <span>{progress.percent}%</span>
          {progress.rps !== null && <span>{progress.rps} req/s</span>}
          {progress.requests !== null && progress.total !== null && (
            <span>
              {progress.requests.toLocaleString()} / {progress.total.toLocaleString()} requests
            </span>
          )}
          {progress.matched !== null && <span className="text-amber-500">{progress.matched} matched</span>}
        </div>
      )}
    </div>
  );
};
