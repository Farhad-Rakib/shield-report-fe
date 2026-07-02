import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, X, Play, Bug } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Loader } from '../../../components/ui/Loader/Loader';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { toast } from '../../../components/ui/Toast/toast.store';
import { EngagementStatusBadge } from '../../../components/badges/PentestBadges';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { scanApi } from '../../../core/api/services/scan.api';
import { staffUserApi } from '../../../core/api/services/staff-user.api';
import { EngagementStatus } from '../../../domain/models/engagement.model';
import { ClientAsset } from '../../../domain/models/client-asset.model';
import { ScanTool } from '../../../domain/models/scan.model';

const STATUS_OPTIONS: EngagementStatus[] = ['Scheduled', 'InProgress', 'InReview', 'Completed'];
const SCAN_TOOLS: ScanTool[] = ['Naabu', 'Nuclei', 'Reconftw'];

export const EngagementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const engagementId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignIsLead, setAssignIsLead] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAssetId, setScanAssetId] = useState('');
  const [selectedTools, setSelectedTools] = useState<ScanTool[]>([]);

  const { data: engagement, isLoading, error, refetch } = useQuery({
    queryKey: ['engagement', engagementId],
    queryFn: () => engagementApi.getById(engagementId),
    enabled: !!engagementId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['staff-users-picker'],
    queryFn: () => staffUserApi.getAll(),
  });
  const pentesters = (usersData ?? []).filter((u) => u.roles.includes('PENTESTER'));

  const { data: assetsData } = useQuery({
    queryKey: ['client-assets', engagement?.clientOrganizationId],
    queryFn: () => clientAssetApi.getAssetsForClient(engagement!.clientOrganizationId, { pageSize: 100 }),
    enabled: !!engagement,
  });
  const scannableAssets = (assetsData?.data ?? []).filter((a: ClientAsset) => a.isAuthorizedForScanning);

  const statusMutation = useMutation({
    mutationFn: (status: EngagementStatus) =>
      engagementApi.updateEngagement(engagementId, {
        title: engagement!.title,
        scope: engagement!.scope,
        startDate: engagement!.startDate,
        endDate: engagement!.endDate,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement', engagementId] });
      toast.success('Engagement status updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to update status'),
  });

  const assignMutation = useMutation({
    mutationFn: () => engagementApi.assignUser(engagementId, { userId: Number(assignUserId), isLead: assignIsLead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement', engagementId] });
      toast.success('Pentester assigned');
      setShowAssignModal(false);
      setAssignUserId('');
      setAssignIsLead(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to assign pentester'),
  });

  const removeAssigneeMutation = useMutation({
    mutationFn: (userId: number) => engagementApi.removeAssignee(engagementId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement', engagementId] });
      toast.success('Assignee removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to remove assignee'),
  });

  const createScanMutation = useMutation({
    mutationFn: () => scanApi.createScan(Number(scanAssetId), { tools: selectedTools, engagementId }),
    onSuccess: (scans) => {
      toast.success(`Scan started with ${scans.length} tool${scans.length === 1 ? '' : 's'}`);
      setShowScanModal(false);
      setScanAssetId('');
      setSelectedTools([]);
      navigate(`/scans/${scans[0].publicId}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to start scan'),
  });

  const toggleTool = (tool: ScanTool) => {
    setSelectedTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));
  };

  if (isLoading) return <Loader />;
  if (error || !engagement) return <ErrorState message={error?.message || 'Engagement not found'} retry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/engagements" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Engagements
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{engagement.title}</h1>
          <EngagementStatusBadge status={engagement.status} />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{engagement.clientOrganizationName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pentester</p>
          <p className="text-gray-900 dark:text-white">{engagement.leadPentesterName}</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeline</p>
          <p className="text-gray-900 dark:text-white">
            {engagement.startDate ? new Date(engagement.startDate).toLocaleDateString() : '—'} → {engagement.endDate ? new Date(engagement.endDate).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
          <select
            value={engagement.status}
            onChange={(e) => statusMutation.mutate(e.target.value as EngagementStatus)}
            disabled={statusMutation.isPending}
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {engagement.scope && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scope</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap border border-gray-200 dark:border-gray-700 rounded-lg p-4">{engagement.scope}</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setShowScanModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Play className="w-4 h-4" /> Run Scoped Scan
        </button>
        <button
          onClick={() => navigate(`/vulnerabilities/new?engagementId=${engagement.id}&clientOrganizationId=${engagement.clientOrganizationId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          <Bug className="w-4 h-4" /> Add Manual Finding
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Team ({engagement.assignees.length})</h2>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <UserPlus className="w-4 h-4" /> Assign Pentester
          </button>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {engagement.assignees.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No pentesters assigned yet</p>
          ) : (
            engagement.assignees.map((a) => (
              <div key={a.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{a.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned {new Date(a.assignedAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeAssigneeMutation.mutate(a.userId)}
                  className="p-2 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Pentester" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pentester</label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a pentester</option>
              {pentesters.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={assignIsLead}
              onChange={(e) => setAssignIsLead(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Set as lead pentester</span>
          </label>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              disabled={assignMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!assignUserId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showScanModal} onClose={() => setShowScanModal(false)} title="Run Scoped Scan" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset</label>
            {scannableAssets.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No scan-authorized assets for this client. Authorize an asset on the Client Assets page first.</p>
            ) : (
              <select
                value={scanAssetId}
                onChange={(e) => setScanAssetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an asset</option>
                {scannableAssets.map((a: ClientAsset) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.identifier})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select scan tools</p>
            <div className="space-y-2">
              {SCAN_TOOLS.map((tool) => (
                <label key={tool} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool)}
                    onChange={() => toggleTool(tool)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tool}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowScanModal(false)}
              disabled={createScanMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!scanAssetId || selectedTools.length === 0 || createScanMutation.isPending}
              onClick={() => createScanMutation.mutate()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Start Scan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
