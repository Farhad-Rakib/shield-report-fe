import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ScanConsolePane } from '../../../components/scan/ScanConsolePane';
import { ScanChainProgress } from '../../../components/scan/ScanChainProgress';
import { ScanStatusBadge, SeverityBadge } from '../../../components/badges/PentestBadges';
import { Loader } from '../../../components/ui/Loader/Loader';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { useScanChainConsole } from '../../../core/hooks/useScanChainConsole';
import { scanApi } from '../../../core/api/services/scan.api';
import { vulnerabilityApi } from '../../../core/api/services/vulnerability.api';
import { ScanStatus } from '../../../domain/models/scan.model';

const TERMINAL_STATUSES: ScanStatus[] = ['Completed', 'Failed', 'Cancelled'];

export const ScanDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const queryClient = useQueryClient();

  const { data: scan, isLoading, error, refetch } = useQuery({
    queryKey: ['scan', publicId],
    queryFn: () => scanApi.getScanByPublicId(publicId!),
    enabled: !!publicId,
  });

  const { lines, steps, connectionError } = useScanChainConsole(scan);

  // The whole chain is done once its last known step reaches a terminal state — individual
  // steps' own statuses drive ScanChainProgress's icons/spinner, this is just "is there
  // anything left to run".
  const lastStep = steps[steps.length - 1];
  const chainComplete = !!lastStep && TERMINAL_STATUSES.includes(lastStep.status);
  const runningStep = steps.find((s) => s.status === 'Running');
  const overallStatus: ScanStatus | undefined = runningStep
    ? 'Running'
    : chainComplete
      ? lastStep.status
      : scan?.status;

  useEffect(() => {
    if (chainComplete) {
      queryClient.invalidateQueries({ queryKey: ['scan', publicId] });
    }
  }, [chainComplete, publicId, queryClient]);

  // Vulnerabilities are tied to whichever tool's Scan actually created them, not necessarily
  // the root scan the URL points at — fan out across every step in the resolved chain and merge.
  const { data: vulnResults } = useQuery({
    queryKey: ['scan-vulnerabilities', steps.map((s) => s.id)],
    queryFn: () => Promise.all(steps.map((s) => vulnerabilityApi.getVulnerabilities({ scanId: s.id }))),
    enabled: chainComplete && steps.length > 0,
  });
  const vulnerabilities = vulnResults?.flatMap((page) => page.data) ?? [];

  if (isLoading) return <Loader />;
  if (error || !scan) return <ErrorState message={error?.message || 'Scan not found'} retry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/assets" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {steps.length > 1 ? 'Scan Chain' : `${scan.tool} Scan`}
          </h1>
          {overallStatus && <ScanStatusBadge status={overallStatus} />}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{scan.clientAssetName}</p>
      </div>

      {connectionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> Live console unavailable: {connectionError}
        </div>
      )}

      <ScanChainProgress steps={steps} />

      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Live Output</h2>
        <ScanConsolePane lines={lines} />
      </div>

      {chainComplete && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Vulnerabilities Found ({vulnerabilities.length})
          </h2>
          {vulnerabilities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No vulnerabilities were auto-created from this scan.</p>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
              {vulnerabilities.map((vuln) => (
                <div key={vuln.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{vuln.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{vuln.endpoint}</p>
                  </div>
                  <SeverityBadge severity={vuln.severity} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
