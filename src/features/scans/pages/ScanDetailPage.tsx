import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ScanConsolePane } from '../../../components/scan/ScanConsolePane';
import { ScanStatusBadge, SeverityBadge } from '../../../components/badges/PentestBadges';
import { Loader } from '../../../components/ui/Loader/Loader';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { useScanConsoleHub } from '../../../core/hooks/useScanConsoleHub';
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

  const { lines, status: hubStatus, connectionError } = useScanConsoleHub(publicId ?? null);
  const effectiveStatus: ScanStatus | undefined = (hubStatus as ScanStatus | null) ?? scan?.status;

  // The scan can finish (or fail, e.g. Reconftw in under a second) before the browser's
  // SignalR connection joins the scan's group, so live-only `lines` can end up empty.
  // Once the scan reaches a terminal state, the server-persisted full log (`scan.rawOutput`)
  // is authoritative and always complete — prefer it over the possibly-partial live stream.
  const displayLines = scan?.rawOutput ? scan.rawOutput.split('\n').filter((line) => line.length > 0) : lines;

  useEffect(() => {
    if (hubStatus && TERMINAL_STATUSES.includes(hubStatus as ScanStatus)) {
      queryClient.invalidateQueries({ queryKey: ['scan', publicId] });
    }
  }, [hubStatus, publicId, queryClient]);

  const { data: vulnData } = useQuery({
    queryKey: ['scan-vulnerabilities', scan?.id],
    queryFn: () => vulnerabilityApi.getVulnerabilities({ scanId: scan!.id }),
    enabled: !!scan && effectiveStatus === 'Completed',
  });
  const vulnerabilities = vulnData?.data ?? [];

  if (isLoading) return <Loader />;
  if (error || !scan) return <ErrorState message={error?.message || 'Scan not found'} retry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/assets" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{scan.tool} Scan</h1>
          {effectiveStatus && <ScanStatusBadge status={effectiveStatus} />}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{scan.clientAssetName}</p>
      </div>

      {connectionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> Live console unavailable: {connectionError}
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Live Output</h2>
        <ScanConsolePane lines={displayLines} />
      </div>

      {effectiveStatus === 'Completed' && (
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
