import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ShieldCheck, RotateCcw } from 'lucide-react';
import { RetestRequestStatusBadge } from '../../../components/badges/PentestBadges';
import { toast } from '../../../components/ui/Toast/toast.store';
import { retestRequestApi } from '../../../core/api/services/retest-request.api';
import { staffUserApi } from '../../../core/api/services/staff-user.api';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { RetestRequestStatus } from '../../../domain/models/retest-request.model';

interface RetestRequestPanelProps {
  vulnerabilityId: number;
  canCreate: boolean;
  canResolve: boolean;
}

export const RetestRequestPanel: React.FC<RetestRequestPanelProps> = ({ vulnerabilityId, canCreate, canResolve }) => {
  const queryClient = useQueryClient();
  const tokenPayload = useAuthStore((s) => s.tokenPayload);
  const amr = tokenPayload?.amr;
  const hasMfaSession = Array.isArray(amr) ? amr.includes('otp') : amr === 'otp';

  const { data: retest, isLoading } = useQuery({
    queryKey: ['retest-request', vulnerabilityId],
    queryFn: () => retestRequestApi.getCurrent(vulnerabilityId),
    enabled: !!vulnerabilityId,
  });

  const { data: staffUsers = [] } = useQuery({
    queryKey: ['staff-users-picker'],
    queryFn: () => staffUserApi.getAll(),
    enabled: canCreate,
  });
  const pentesters = staffUsers.filter((u) => u.roles.includes('PENTESTER'));

  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [newCase, setNewCase] = useState('');
  const [cases, setCases] = useState<string[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [checkedCaseIds, setCheckedCaseIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (retest?.cases) {
      setCheckedCaseIds(Object.fromEntries(retest.cases.map((c) => [c.id, c.isChecked])));
    }
  }, [retest]);

  const createMutation = useMutation({
    mutationFn: () =>
      retestRequestApi.create(vulnerabilityId, {
        assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
        instructions: instructions || null,
        cases: cases.length > 0 ? cases : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retest-request', vulnerabilityId] });
      setAssignedToUserId('');
      setInstructions('');
      setCases([]);
      toast.success('Retest requested');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to request retest'),
  });

  const resolveMutation = useMutation({
    mutationFn: (outcome: RetestRequestStatus) =>
      retestRequestApi.resolve(vulnerabilityId, {
        outcome,
        resolutionNotes: resolutionNotes || null,
        cases: retest?.cases.map((c) => ({ id: c.id, isChecked: checkedCaseIds[c.id] ?? c.isChecked })) ?? null,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['retest-request', vulnerabilityId] });
      queryClient.invalidateQueries({ queryKey: ['vulnerability', vulnerabilityId] });
      setResolutionNotes('');
      toast.success(updated.status === 'VerifiedClosed' ? 'Retest verified as closed' : 'Vulnerability reopened');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to resolve retest'),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading retest status...</p>;
  }

  const isPending = retest?.status === 'Pending';

  return (
    <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Retest</h2>
        {retest && <RetestRequestStatusBadge status={retest.status} />}
      </div>

      {retest ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700 dark:text-gray-300">
            <p><span className="text-gray-500 dark:text-gray-400">Requested by:</span> {retest.requestedByUserName}</p>
            <p><span className="text-gray-500 dark:text-gray-400">Requested at:</span> {new Date(retest.requestedAt).toLocaleString()}</p>
            {retest.assignedToUserName && (
              <p><span className="text-gray-500 dark:text-gray-400">Assigned to:</span> {retest.assignedToUserName}</p>
            )}
            {retest.resolvedByUserName && (
              <p><span className="text-gray-500 dark:text-gray-400">Resolved by:</span> {retest.resolvedByUserName}</p>
            )}
          </div>

          {retest.instructions && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Instructions</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{retest.instructions}</p>
            </div>
          )}

          {retest.cases.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Checklist</p>
              <div className="space-y-1">
                {retest.cases.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedCaseIds[c.id] ?? c.isChecked}
                      disabled={!isPending || !canResolve}
                      onChange={(e) => setCheckedCaseIds((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{c.caseText}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {retest.resolutionNotes && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resolution Notes</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{retest.resolutionNotes}</p>
            </div>
          )}

          {isPending && canResolve && (
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
                placeholder="Resolution notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {!hasMfaSession && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Verifying as closed requires a multi-factor-authenticated session.</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => resolveMutation.mutate('Reopened')}
                  disabled={resolveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> Reopen
                </button>
                <button
                  onClick={() => resolveMutation.mutate('VerifiedClosed')}
                  disabled={resolveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" /> Verify Closed
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No retest has been requested for this vulnerability yet.</p>
      )}

      {canCreate && !isPending && (
        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Request a Retest</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reassign to (optional)</label>
            <select
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Same pentester</option>
              {pentesters.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="What should the pentester re-verify?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Checklist</label>
            <div className="space-y-1 mb-2">
              {cases.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex-1">{c}</span>
                  <button onClick={() => setCases((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newCase}
                onChange={(e) => setNewCase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCase.trim()) {
                    e.preventDefault();
                    setCases((prev) => [...prev, newCase.trim()]);
                    setNewCase('');
                  }
                }}
                placeholder="Add a checklist item..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (newCase.trim()) {
                    setCases((prev) => [...prev, newCase.trim()]);
                    setNewCase('');
                  }
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Request Retest
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
