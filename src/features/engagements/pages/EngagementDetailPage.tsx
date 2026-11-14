import { SendReportModal } from '../../reports/components/SendReportModal';
import { GenerateReportModal } from '../../reports/components/GenerateReportModal';
import { scanToolApi } from '../../../core/api/services/scan-tool.api';
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, X, Play, Bug, FileText, Download, Eye, Check, RefreshCw, Trash2, Mail, Sparkles } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../../components/ui/Dialog/ConfirmDialog';
import { Loader } from '../../../components/ui/Loader/Loader';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { toast } from '../../../components/ui/Toast/toast.store';
import { EngagementStatusBadge, SeverityBadge, PatchStatusBadge } from '../../../components/badges/PentestBadges';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { clientAssetApi } from '../../../core/api/services/client-asset.api';
import { scanApi } from '../../../core/api/services/scan.api';
import { staffUserApi } from '../../../core/api/services/staff-user.api';
import { reportApi } from '../../../core/api/services/report.api';
import { vulnerabilityApi } from '../../../core/api/services/vulnerability.api';
import { EngagementStatus, TestingType, TESTING_TYPE_LABELS } from '../../../domain/models/engagement.model';
import { ClientAsset } from '../../../domain/models/client-asset.model';
import { ScanTool, getScanToolLabel } from '../../../domain/models/scan.model';
import { Report } from '../../../domain/models/report.model';
import { useAuthStore } from '../../auth/store/auth.store';
import { Permissions } from '../../../core/constants/permissions';

const STATUS_OPTIONS: EngagementStatus[] = ['Scheduled', 'InProgress', 'InReview', 'Completed'];

// Saves the file under the server's file name. (Opening the blob in a new tab instead gave the
// file a random name, .docx tabs saved without an extension, and Chrome's popup blocker dropped the
// window.open once fetching a large file outlived the click's user activation.) The report can be
// read in the browser with Preview.
function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
}

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
  // Keys: built-in tool name, or "Custom:<id>" for a registered custom tool.
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  // Only enabled tools (Configuration → Scan Tools) are offered.
  const { data: availableTools = [] } = useQuery({ queryKey: ['scan-tools-available'], queryFn: () => scanToolApi.available() });

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

  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', engagementId],
    queryFn: () => reportApi.listForEngagement(engagementId),
    enabled: !!engagementId,
    // Poll while an AI draft is being written in the background.
    refetchInterval: (query) => ((query.state.data ?? []).some((r) => r.narrativeStatus === 'Drafting') ? 4000 : false),
  });

  const { data: engagementScansData } = useQuery({
    queryKey: ['scans', 'engagement', engagementId],
    queryFn: () => scanApi.getScans({ engagementId, pageSize: 100 }),
    enabled: !!engagementId,
  });
  const engagementScans = engagementScansData?.data ?? [];
  const scanningInProgress = engagementScans.some((s) => s.status === 'Queued' || s.status === 'Running');
  // "Scanning is done" requires at least one scan to have actually run — an engagement with no
  // scans yet hasn't had its automated scanning phase completed at all.
  const scanningComplete = engagementScans.length > 0 && !scanningInProgress;

  const { data: engagementVulnerabilitiesData, isLoading: vulnerabilitiesLoading } = useQuery({
    queryKey: ['vulnerabilities', 'engagement', engagementId],
    queryFn: () => vulnerabilityApi.getVulnerabilities({ engagementId, pageSize: 100 }),
    enabled: !!engagementId,
  });
  const engagementVulnerabilities = engagementVulnerabilitiesData?.data ?? [];

  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState({
    executiveSummary: '',
    keyFindings: '',
    keyRecommendations: '',
    projectGoals: '',
    limitations: '',
    showToolNames: false,
    scopeStatuses: {} as Record<string, string>,
    customFieldValues: {} as Record<string, string>,
  });
  const [editingFields, setEditingFields] = useState<NonNullable<Report['customFields']>>([]);
  const [editingIsHtml, setEditingIsHtml] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState<Report | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingReportId, setDeletingReportId] = useState<number | null>(null);

  const invalidateReports = () => queryClient.invalidateQueries({ queryKey: ['reports', engagementId] });

  const [generateOpen, setGenerateOpen] = useState(false);

  const draftNarrativeMutation = useMutation({
    mutationFn: (id: number) => reportApi.draftNarrative(id),
    onSuccess: () => {
      invalidateReports();
      toast.success('AI drafting started. The report updates when it is done');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to start AI drafting'),
  });

  const updateNarrativeMutation = useMutation({
    // Edits happen only inside the app — saving re-fills the stored .docx draft immediately so
    // the pentester's edits are reflected without any upload/download round-trip through Word.
    mutationFn: async () => {
      const { executiveSummary, keyFindings, keyRecommendations, projectGoals, limitations, showToolNames, scopeStatuses, customFieldValues } = narrativeDraft;
      const missingRequired = editingFields.filter((f) => f.required && !(customFieldValues[f.key] ?? '').trim() && !(f.defaultValue ?? '').trim());
      if (missingRequired.length > 0) {
        throw new Error(`Fill in the required field(s): ${missingRequired.map((f) => f.label).join(', ')}`);
      }
      await reportApi.updateNarrative(editingReportId!, { executiveSummary, keyFindings, keyRecommendations });
      if (editingIsHtml) {
        await reportApi.updateSections(editingReportId!, { projectGoals, limitations, showToolNames, scopeStatuses, customFieldValues });
      }
      return reportApi.regenerate(editingReportId!);
    },
    onSuccess: () => {
      invalidateReports();
      toast.success('Report sections saved — PDF and Word regenerated');
      setEditingReportId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to save narrative'),
  });

  const convertToPdfMutation = useMutation({
    mutationFn: (id: number) => reportApi.convertToPdf(id),
    onSuccess: () => {
      invalidateReports();
      toast.success('Report converted to PDF');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to convert report to PDF'),
  });

  const approveReportMutation = useMutation({
    mutationFn: (id: number) => reportApi.approve(id),
    onSuccess: () => {
      invalidateReports();
      toast.success('Report approved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to approve report'),
  });

  const rejectReportMutation = useMutation({
    mutationFn: () => reportApi.reject(rejectingReportId!, rejectReason),
    onSuccess: () => {
      invalidateReports();
      toast.success('Report rejected');
      setRejectingReportId(null);
      setRejectReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to reject report'),
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: number) => reportApi.deleteReport(id),
    onSuccess: () => {
      invalidateReports();
      toast.success('Report deleted');
      setDeletingReportId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to delete report'),
  });

  const downloadDraft = async (report: Report) => {
    try {
      const { blob, fileName } = await reportApi.downloadDraft(report.id);
      saveBlob(blob, fileName);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to download the Word file');
    }
  };

  const downloadPdf = async (report: Report) => {
    try {
      const { blob, fileName } = await reportApi.downloadPdf(report.id);
      saveBlob(blob, fileName);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to download the PDF');
    }
  };

  const openNarrativeEditor = (report: Report) => {
    setEditingReportId(report.id);
    setEditingIsHtml(report.hasHtmlPreview);
    setNarrativeDraft({
      executiveSummary: report.executiveSummary,
      keyFindings: report.keyFindings,
      keyRecommendations: report.keyRecommendations,
      projectGoals: report.projectGoals,
      limitations: report.limitations,
      showToolNames: report.showToolNames,
      scopeStatuses: { ...report.scopeStatuses },
      customFieldValues: { ...(report.customFieldValues ?? {}) },
    });
    setEditingFields(report.customFields ?? []);
  };

  const openPreview = async (report: Report) => {
    try {
      setPreviewHtml(await reportApi.preview(report.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to load preview');
    }
  };

  const testingTypeMutation = useMutation({
    mutationFn: (testingType: TestingType) =>
      engagementApi.updateEngagement(engagementId, {
        title: engagement!.title,
        scope: engagement!.scope,
        startDate: engagement!.startDate,
        endDate: engagement!.endDate,
        testingType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement', engagementId] });
      toast.success('Testing type updated — applies to reports generated from now on');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to update testing type'),
  });

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
    mutationFn: () =>
      scanApi.createScan(Number(scanAssetId), {
        tools: selectedTools.filter((k) => !k.startsWith('Custom:')) as ScanTool[],
        customToolIds: selectedTools.filter((k) => k.startsWith('Custom:')).map((k) => Number(k.slice(7))),
        engagementId,
      }),
    onSuccess: (scans) => {
      toast.success(`Scan started with ${scans.length} tool${scans.length === 1 ? '' : 's'}`);
      setShowScanModal(false);
      setScanAssetId('');
      setSelectedTools([]);
      // ScansListPage's ['scans'] query has a 5-minute global staleTime (AppProviders.tsx) and
      // nothing else invalidates it — without this, a scan created here won't show up on the
      // Scans list page if the list was already cached from earlier in the session (looks like
      // the running scan "vanished" if you flip to another menu and back to Scans quickly).
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      navigate(`/scans/${scans[0].publicId}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to start scan'),
  });

  const toggleTool = (tool: string) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Testing Type (report wording)</p>
          <select
            value={engagement.testingType ?? 'White'}
            onChange={(e) => testingTypeMutation.mutate(e.target.value as TestingType)}
            disabled={testingTypeMutation.isPending}
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(TESTING_TYPE_LABELS) as TestingType[]).map((t) => (
              <option key={t} value={t}>{TESTING_TYPE_LABELS[t]}</option>
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

      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vulnerabilities ({engagementVulnerabilities.length})</h2>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {vulnerabilitiesLoading ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Loading vulnerabilities…</p>
          ) : engagementVulnerabilities.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No vulnerabilities found for this engagement yet</p>
          ) : (
            engagementVulnerabilities.map((v) => (
              <Link
                key={v.id}
                to={`/vulnerabilities/${v.id}`}
                className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{v.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.clientAssetName ?? '—'} · {v.endpoint}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SeverityBadge severity={v.severityOverride ?? v.severity} />
                  <PatchStatusBadge patchStatus={v.patchStatus} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reports ({reports.length})</h2>
          {hasPermission(Permissions.VulnerabilityReportsGenerate) && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setGenerateOpen(true)}
                disabled={!scanningComplete}
                title={!scanningComplete ? 'Scanning must complete for this engagement before a report can be generated' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-3.5 h-3.5" /> Generate Report
              </button>
              {!scanningComplete && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {scanningInProgress ? 'A scan is still running for this engagement.' : 'No scans have been run for this engagement yet.'}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {reports.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No reports generated yet</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Version {report.version}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {report.status} · Generated {new Date(report.generatedAt).toLocaleString()}
                      {report.templateName && <> · {report.templateName}</>}
                    </p>
                    {report.narrativeStatus === 'Drafting' && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                        <Sparkles className="w-3 h-3 animate-pulse" /> AI is drafting the summary sections…
                      </p>
                    )}
                    {report.narrativeStatus === 'Failed' && report.status === 'PendingApproval' && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">AI drafting failed: {report.narrativeError ?? 'unknown error'}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {report.status === 'PendingApproval' && (
                      <button
                        onClick={() => openNarrativeEditor(report)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> Edit Sections
                      </button>
                    )}
                    {report.status === 'PendingApproval' && report.narrativeStatus !== 'Drafting' && hasPermission(Permissions.VulnerabilityReportsGenerate) && (
                      <button
                        onClick={() => draftNarrativeMutation.mutate(report.id)}
                        disabled={draftNarrativeMutation.isPending}
                        title="Replace the executive summary, key findings and recommendations with an AI draft"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {report.narrativeStatus === 'Failed' ? 'Retry AI draft' : 'Draft with AI'}
                      </button>
                    )}
                    {report.hasHtmlPreview && (
                      <button
                        onClick={() => openPreview(report)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" /> Preview
                      </button>
                    )}
                    {report.status === 'PendingApproval' && hasPermission(Permissions.VulnerabilityReportsApprove) && (
                      <>
                        <button
                          onClick={() => approveReportMutation.mutate(report.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectingReportId(report.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-medium"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {report.draftAvailable && hasPermission(Permissions.VulnerabilityReportsDownload) && (
                      <button
                        onClick={() => downloadDraft(report)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> {report.hasHtmlPreview ? 'Download Word' : 'Download Draft (.docx)'}
                      </button>
                    )}
                    {/* HTML-engine reports get their PDF at generation time; only legacy .docx reports need converting. */}
                    {report.draftAvailable && !report.hasHtmlPreview && hasPermission(Permissions.VulnerabilityReportsGenerate) && (
                      <button
                        onClick={() => convertToPdfMutation.mutate(report.id)}
                        disabled={convertToPdfMutation.isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Convert to PDF
                      </button>
                    )}
                    {report.pdfAvailable && hasPermission(Permissions.VulnerabilityReportsDownload) && (
                      <button
                        onClick={() => downloadPdf(report)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    )}
                    {report.status === 'Approved' && report.pdfAvailable && hasPermission(Permissions.VulnerabilityReportsSend) && (
                      <button
                        onClick={() => setSendingReport(report)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-medium"
                      >
                        <Mail className="w-3.5 h-3.5" /> Send to Client
                      </button>
                    )}
                    {hasPermission(Permissions.VulnerabilityReportsDelete) && (
                      <button
                        onClick={() => setDeletingReportId(report.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
                {report.status === 'Rejected' && report.rejectionReason && (
                  <p className="text-xs text-red-600 dark:text-red-400">Rejected: {report.rejectionReason}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <GenerateReportModal
        isOpen={generateOpen}
        engagementId={engagementId}
        engagementTestingType={engagement.testingType ?? 'White'}
        onClose={() => setGenerateOpen(false)}
        onGenerated={() => {
          setGenerateOpen(false);
          invalidateReports();
          queryClient.invalidateQueries({ queryKey: ['engagement', engagementId] });
        }}
      />

      <Modal isOpen={editingReportId !== null} onClose={() => setEditingReportId(null)} title="Edit Report Sections" size="xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Executive Summary</label>
            <textarea
              value={narrativeDraft.executiveSummary}
              onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, executiveSummary: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Findings</label>
            <textarea
              value={narrativeDraft.keyFindings}
              onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, keyFindings: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Recommendations</label>
            <textarea
              value={narrativeDraft.keyRecommendations}
              onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, keyRecommendations: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {editingIsHtml && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lines starting with "- " become bullet points. Text is shown exactly as typed (no formatting codes).</p>
              {engagement.testingType !== 'Black' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Goals and Objectives</label>
                  <textarea
                    value={narrativeDraft.projectGoals}
                    onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, projectGoals: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limitations</label>
                <textarea
                  value={narrativeDraft.limitations}
                  onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, limitations: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              {(assetsData?.data ?? []).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope status per asset <span className="font-normal text-gray-400">(shown in the Scope of Engagement table; empty = "Completed")</span></p>
                  <div className="space-y-2">
                    {(assetsData?.data ?? []).map((asset: ClientAsset) => (
                      <div key={asset.id} className="flex items-center gap-3">
                        <span className="w-1/2 text-sm text-gray-700 dark:text-gray-300 truncate" title={asset.identifier}>{asset.name}</span>
                        <input
                          value={narrativeDraft.scopeStatuses[String(asset.id)] ?? ''}
                          placeholder="Completed"
                          onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, scopeStatuses: { ...prev.scopeStatuses, [String(asset.id)]: e.target.value } }))}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={narrativeDraft.showToolNames}
                  onChange={(e) => setNarrativeDraft((prev) => ({ ...prev, showToolNames: e.target.checked }))}
                />
                <span>
                  Name the actual tools in this report
                  <span className="block text-xs text-gray-400">Off (default): methodology and "Tools Used" use generic wording such as "Vulnerability Scanning", as everywhere else clients see.</span>
                </span>
              </label>
              {editingFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Template fields</p>
                  {editingFields.map((f) => {
                    const value = narrativeDraft.customFieldValues[f.key] ?? '';
                    const setValue = (v: string) => setNarrativeDraft((prev) => ({ ...prev, customFieldValues: { ...prev.customFieldValues, [f.key]: v } }));
                    return (
                      <label key={f.key} className="block">
                        <span className="label">
                          {f.label} {f.required && <span className="text-red-500">*</span>} <span className="font-mono font-normal text-gray-400">Custom.{f.key}</span>
                        </span>
                        {f.type === 'multiline' ? (
                          <textarea className="input h-auto" rows={3} value={value} placeholder={f.defaultValue ?? ''} onChange={(e) => setValue(e.target.value)} />
                        ) : (
                          <input
                            className="input"
                            type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                            value={value}
                            placeholder={f.defaultValue ?? ''}
                            onChange={(e) => setValue(e.target.value)}
                          />
                        )}
                        {f.help && <span className="text-2xs text-gray-500">{f.help}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setEditingReportId(null)}
              disabled={updateNarrativeMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateNarrativeMutation.mutate()}
              disabled={updateNarrativeMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateNarrativeMutation.isPending ? 'Saving & regenerating…' : 'Save & Regenerate'}
            </button>
          </div>
        </div>
      </Modal>

      <SendReportModal report={sendingReport} onClose={() => setSendingReport(null)} />

      {/* sandbox="" : no scripts, no same-origin access — the report HTML is display-only here. */}
      <Modal isOpen={previewHtml !== null} onClose={() => setPreviewHtml(null)} title="Report Preview" size="xl">
        <iframe
          title="Report preview"
          sandbox=""
          srcDoc={previewHtml ?? ''}
          className="w-full h-[75vh] bg-white rounded border border-gray-200 dark:border-gray-700"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Continuous preview of the exact content in the PDF and Word files (page layout, page numbers and the contents page appear in the PDF).</p>
      </Modal>

      <Modal isOpen={rejectingReportId !== null} onClose={() => setRejectingReportId(null)} title="Reject Report" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setRejectingReportId(null)}
              disabled={rejectReportMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectReason.trim() || rejectReportMutation.isPending}
              onClick={() => rejectReportMutation.mutate()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deletingReportId !== null}
        onClose={() => setDeletingReportId(null)}
        onConfirm={() => deletingReportId !== null && deleteReportMutation.mutate(deletingReportId)}
        title="Delete Report"
        message="Are you sure you want to delete this report version? Its draft and PDF files will also be removed. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

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
              {availableTools.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">All scan tools are currently disabled (Configuration → Scan Tools).</p>
              )}
              {availableTools.map(({ tool, label, customToolId }) => {
                const key = customToolId ? `Custom:${customToolId}` : tool;
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(key)}
                      onChange={() => toggleTool(key)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{customToolId ? label : getScanToolLabel(tool)}</span>
                    {customToolId && <span className="badge-neutral">custom</span>}
                  </label>
                );
              })}
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
