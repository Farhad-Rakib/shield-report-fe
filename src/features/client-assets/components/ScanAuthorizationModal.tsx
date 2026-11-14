import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Paperclip, ShieldCheck, ShieldOff, Upload } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { scanAuthorizationApi, scanAuthorizationEvidenceApi } from '../../../core/api/services/scan-authorization.api';
import { ClientAsset } from '../../../domain/models/client-asset.model';
import { ScanAuthorization, ScanAuthorizationStatus } from '../../../domain/models/scan-authorization.model';
import { ScanTool, SCAN_TOOL_LABELS } from '../../../domain/models/scan.model';

// 'Custom' covers every registered custom tool.
const ALL_TOOLS: ScanTool[] = ['Naabu', 'Nuclei', 'Reconftw', 'Custom'];

const STATUS_STYLES: Record<ScanAuthorizationStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : 'No end date');

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

interface ScanAuthorizationModalProps {
  asset: ClientAsset | null;
  canManage: boolean;
  onClose: () => void;
}

// History + management of an asset's scan authorizations. Scans can only start while an Active
// authorization covers the requested tools; every scan records which authorization it ran under.
export const ScanAuthorizationModal: React.FC<ScanAuthorizationModalProps> = ({ asset, canManage, onClose }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [form, setForm] = useState({
    clientContactName: '',
    clientContactEmail: '',
    validFrom: '',
    validUntil: '',
    notes: '',
    tools: [...ALL_TOOLS] as ScanTool[],
    evidence: null as File | null,
  });

  const assetId = asset?.id ?? 0;
  const { data: authorizations = [], isLoading } = useQuery({
    queryKey: ['scan-authorizations', assetId],
    queryFn: () => scanAuthorizationApi.list(assetId),
    enabled: !!asset,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['scan-authorizations', assetId] });
    // The asset list shows an "authorized" badge derived from these records.
    queryClient.invalidateQueries({ queryKey: ['client-assets'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await scanAuthorizationApi.create(assetId, {
        clientContactName: form.clientContactName || null,
        clientContactEmail: form.clientContactEmail || null,
        // Date inputs are calendar days: start of the first day, end of the last day (UTC).
        validFrom: form.validFrom ? `${form.validFrom}T00:00:00Z` : null,
        validUntil: form.validUntil ? `${form.validUntil}T23:59:59Z` : null,
        allowedTools: form.tools,
        notes: form.notes || null,
      });
      if (form.evidence) {
        await scanAuthorizationEvidenceApi.upload(created.id, form.evidence);
      }
      return created;
    },
    onSuccess: () => {
      toast.success('Scan authorization recorded');
      setShowForm(false);
      setForm({ clientContactName: '', clientContactEmail: '', validFrom: '', validUntil: '', notes: '', tools: [...ALL_TOOLS], evidence: null });
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to record authorization')),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => scanAuthorizationEvidenceApi.upload(id, file),
    onSuccess: () => {
      toast.success('Evidence uploaded');
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to upload evidence')),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => scanAuthorizationApi.revoke(id, reason),
    onSuccess: () => {
      toast.success('Scan authorization revoked');
      setRevokingId(null);
      setRevokeReason('');
      refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to revoke authorization')),
  });

  const downloadEvidence = async (authorization: ScanAuthorization) => {
    try {
      const blob = await scanAuthorizationApi.downloadEvidence(authorization.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = authorization.evidenceFileName ?? 'evidence';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to download evidence'));
    }
  };

  const toggleTool = (tool: ScanTool) =>
    setForm((f) => ({ ...f, tools: f.tools.includes(tool) ? f.tools.filter((t) => t !== tool) : [...f.tools, tool] }));

  const active = authorizations.find((a) => a.status === 'Active');

  return (
    <Modal isOpen={!!asset} onClose={onClose} title={`Scan Authorization — ${asset?.name ?? ''}`} size="xl">
      <div className="space-y-5">
        <div
          className={`flex items-start gap-3 p-3 rounded-lg border ${
            active
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
              : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
          }`}
        >
          {active ? <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" /> : <ShieldOff className="w-5 h-5 text-amber-600 mt-0.5" />}
          <div className="text-sm">
            {active ? (
              <p className="text-emerald-800 dark:text-emerald-300">
                Scanning is authorized until <strong>{formatDate(active.validUntil)}</strong> for{' '}
                {active.allowedTools.map((t) => SCAN_TOOL_LABELS[t]).join(', ')}.
              </p>
            ) : (
              <p className="text-amber-800 dark:text-amber-300">
                No active authorization — scans of <strong>{asset?.identifier}</strong> are blocked until the client's approval is recorded.
              </p>
            )}
          </div>
        </div>

        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <ShieldCheck className="w-4 h-4" /> Record new authorization
          </button>
        )}

        {canManage && showForm && (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Client contact name
                <input className={inputClass} value={form.clientContactName} onChange={(e) => setForm({ ...form, clientContactName: e.target.value })} placeholder="Who approved on the client side" />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Client contact email
                <input className={inputClass} type="email" value={form.clientContactEmail} onChange={(e) => setForm({ ...form, clientContactEmail: e.target.value })} />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Valid from <span className="text-gray-400">(default: now)</span>
                <input className={inputClass} type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Valid until <span className="text-gray-400">(default: 30 days)</span>
                <input className={inputClass} type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </label>
            </div>

            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Allowed tools</p>
              <div className="flex flex-wrap gap-4">
                {ALL_TOOLS.map((tool) => (
                  <label key={tool} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.tools.includes(tool)} onChange={() => toggleTool(tool)} />
                    {SCAN_TOOL_LABELS[tool]}
                  </label>
                ))}
              </div>
            </div>

            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Notes
              <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Scope, conditions, ticket reference…" />
            </label>

            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Evidence <span className="text-gray-400">(signed scope letter or approval email — recommended; PDF, image, .eml, .msg, .txt, .docx, max 25 MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.txt,.docx"
                onChange={(e) => setForm({ ...form, evidence: e.target.files?.[0] ?? null })}
                className="block mt-1 text-sm text-gray-700 dark:text-gray-300"
              />
            </label>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || form.tools.length === 0}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Saving…' : 'Record authorization'}
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">History</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : authorizations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No authorizations recorded for this asset yet.</p>
          ) : (
            <ul className="space-y-3">
              {authorizations.map((a) => (
                <li key={a.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Recorded {formatDate(a.createdAt)} by {a.authorizedByEmail ?? `user #${a.authorizedByUserId}`}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {formatDate(a.validFrom)} → {formatDate(a.validUntil)} · {a.allowedTools.map((t) => SCAN_TOOL_LABELS[t]).join(', ')}
                  </p>
                  {(a.clientContactName || a.clientContactEmail) && (
                    <p className="text-gray-600 dark:text-gray-400">
                      Client approval: {a.clientContactName}
                      {a.clientContactEmail ? ` <${a.clientContactEmail}>` : ''}
                    </p>
                  )}
                  {a.notes && <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{a.notes}</p>}
                  {a.status === 'Revoked' && (
                    <p className="text-red-600 dark:text-red-400">
                      Revoked {formatDate(a.revokedAt)} by {a.revokedByEmail ?? `user #${a.revokedByUserId}`}: {a.revocationReason}
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    {a.hasEvidence ? (
                      <button onClick={() => downloadEvidence(a)} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                        <FileText className="w-4 h-4" /> {a.evidenceFileName}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Paperclip className="w-4 h-4" /> No evidence attached
                      </span>
                    )}
                    {canManage && a.status !== 'Revoked' && (
                      <label className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 cursor-pointer hover:underline">
                        <Upload className="w-4 h-4" /> {a.hasEvidence ? 'Replace evidence' : 'Upload evidence'}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.txt,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadMutation.mutate({ id: a.id, file });
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                    {canManage && (a.status === 'Active' || a.status === 'Scheduled') && revokingId !== a.id && (
                      <button onClick={() => setRevokingId(a.id)} className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
                        <ShieldOff className="w-4 h-4" /> Revoke
                      </button>
                    )}
                  </div>

                  {revokingId === a.id && (
                    <div className="flex gap-2 pt-2">
                      <input
                        className={inputClass}
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Reason (required) — e.g. client withdrew consent"
                        autoFocus
                      />
                      <button
                        onClick={() => revokeMutation.mutate({ id: a.id, reason: revokeReason.trim() })}
                        disabled={!revokeReason.trim() || revokeMutation.isPending}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        Confirm revoke
                      </button>
                      <button onClick={() => { setRevokingId(null); setRevokeReason(''); }} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
