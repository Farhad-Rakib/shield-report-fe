import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Circle, Ban, ArrowRight } from 'lucide-react';
import { ChainStep } from '../../core/hooks/useScanChainConsole';

// Cosmetic only — there's no granular real progress within a single tool run, just raw output
// lines, so this cycles a few plausible status phrases per tool while it's Running, in the
// spirit of how nuclei/naabu's own CLI banners narrate what they're doing.
const PHRASES: Record<string, string[]> = {
  Naabu: ['Discovering open ports...', 'Probing hosts...', 'Mapping attack surface...'],
  Nuclei: ['Matching vulnerability templates...', 'Running detection signatures...', 'Extracting results...'],
  Reconftw: ['Enumerating subdomains...', 'Resolving hosts...', 'Expanding recon scope...'],
};

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

function useCyclingPhrase(tool: string, active: boolean): string {
  const phrases = PHRASES[tool] ?? ['Scanning...'];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % phrases.length), 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tool]);
  return phrases[index];
}

function StepIcon({ status }: { status: ChainStep['status'] }) {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'Failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'Cancelled':
      return <Ban className="w-5 h-5 text-gray-400" />;
    case 'Running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />;
  }
}

interface ScanChainProgressProps {
  steps: ChainStep[];
}

export const ScanChainProgress: React.FC<ScanChainProgressProps> = ({ steps }) => {
  const activeStep = steps.find((s) => s.status === 'Running');
  const isActiveRunning = !!activeStep;
  const spinner = useSpinnerFrame(isActiveRunning);
  const phrase = useCyclingPhrase(activeStep?.tool ?? '', isActiveRunning);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.publicId} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <StepIcon status={step.status} />
              <span
                className={`text-sm font-medium ${
                  step.status === 'Running' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {step.tool}
              </span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
          </div>
        ))}
      </div>

      {isActiveRunning && (
        <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
          <span className="inline-block w-4">{spinner}</span> {phrase}
        </p>
      )}
    </div>
  );
};
