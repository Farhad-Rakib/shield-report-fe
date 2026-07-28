import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Radar, Circle, Ban, ArrowRight } from 'lucide-react';
import { ChainStep, ScanProgress } from '../../core/hooks/useScanChainConsole';
import { ScanProgressBar } from './ScanProgressBar';
import { getScanToolLabel } from '../../domain/models/scan.model';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function useSpinnerFrame(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, [active]);
  return SPINNER_FRAMES[frame];
}

function StepIcon({ status }: { status: ChainStep['status'] }) {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'Failed':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'Cancelled':
      return <Ban className="w-5 h-5 text-gray-500" />;
    case 'Running':
      return <Radar className="w-5 h-5 text-cyan-400 animate-radar-sweep" />;
    default:
      return <Circle className="w-5 h-5 text-gray-600" />;
  }
}

interface ScanChainProgressProps {
  steps: ChainStep[];
  latestPhase: string | null;
  findingCounts: Record<string, number>;
  progress: ScanProgress | null;
}

export const ScanChainProgress: React.FC<ScanChainProgressProps> = ({ steps, latestPhase, findingCounts, progress }) => {
  const activeStep = steps.find((s) => s.status === 'Running');
  const isActiveRunning = !!activeStep;
  const spinner = useSpinnerFrame(isActiveRunning);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-500/20 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => {
          const found = findingCounts[step.publicId] ?? 0;
          return (
            <div key={step.publicId} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <StepIcon status={step.status} />
                <span
                  className={`text-sm font-medium font-mono ${
                    step.status === 'Running' ? 'text-cyan-400' : 'text-gray-300'
                  }`}
                >
                  {getScanToolLabel(step.tool)}
                </span>
                {found > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400">
                    {found} found
                  </span>
                )}
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-600" />}
            </div>
          );
        })}
      </div>

      {isActiveRunning && latestPhase && (
        <p className="text-sm font-mono text-cyan-400">
          <span className="inline-block w-4">{spinner}</span> {latestPhase}
        </p>
      )}

      <ScanProgressBar progress={progress} active={isActiveRunning} />
    </div>
  );
};
