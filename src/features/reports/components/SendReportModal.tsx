import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Mail, XCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { reportApi } from '../../../core/api/services/report.api';
import { Report, ReportDelivery, ReportRecipientOption } from '../../../domain/models/report.model';

type ApiError = { response?: { data?: { message?: string } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  return e?.response?.data?.message || e?.message || fallback;
};

const STATUS_ICON: Record<ReportDelivery['status'], React.ReactNode> = {
  Pending: <Clock className="w-4 h-4 text-blue-500" />,
  Sent: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  PartiallySent: <XCircle className="w-4 h-4 text-amber-500" />,
  Failed: <XCircle className="w-4 h-4 text-red-600" />,
};

const NO_OPTIONS: ReportRecipientOption[] = [];

// Emails an approved report to the client's own contacts (primary contact + portal users). The
// server sends in the background and retries; this view polls the delivery status.
export const SendReportModal: React.FC<{ report: Report | null; onClose: () => void }> = ({ report, onClose }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [attachWord, setAttachWord] = useState(false);
  const reportId = report?.id ?? 0;

  // No `= []` default here: a fresh array on every render would re-run the effect below, whose
  // setSelected re-renders again: an endless render loop while the modal is closed, which starved
  // every route change on the engagement page.
  const { data: optionsData, isLoading } = useQuery({
    queryKey: ['report-recipient-options', reportId],
    queryFn: () => reportApi.recipientOptions(reportId),
    enabled: !!report,
  });
  const options = optionsData ?? NO_OPTIONS;

  const { data: deliveries = [] } = useQuery({
    queryKey: ['report-deliveries', reportId],
    queryFn: () => reportApi.deliveries(reportId),
    enabled: !!report,
    // Keep polling while something is still being sent.
    refetchInterval: (query) => ((query.state.data ?? []).some((d) => d.status === 'Pending') ? 3000 : false),
  });

  useEffect(() => {
    // Default: everyone except plain client users (they still see it in the portal).
    if (optionsData) setSelected(optionsData.filter((o) => o.source !== 'Client user').map((o) => o.email));
  }, [optionsData]);

  useEffect(() => {
    if (!report) {
      setMessage('');
      setAttachWord(false);
    }
  }, [report]);

  const sendMutation = useMutation({
    mutationFn: () => reportApi.send(reportId, { recipients: selected, message: message.trim() || null, attachWord }),
    onSuccess: () => {
      toast.success('Report queued for sending');
      queryClient.invalidateQueries({ queryKey: ['report-deliveries', reportId] });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to send report')),
  });

  const toggle = (email: string) => setSelected((s) => (s.includes(email) ? s.filter((e) => e !== email) : [...s, email]));

  return (
    <Modal isOpen={!!report} onClose={onClose} title={`Send Report v${report?.version ?? ''} to Client`} size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipients</p>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This client has no contacts yet. Set a primary contact email on the client organization, or invite client users to the portal.
            </p>
          ) : (
            <div className="space-y-1.5">
              {options.map((o) => (
                <label key={o.email} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={selected.includes(o.email)} onChange={() => toggle(o.email)} />
                  <span className="font-medium">{o.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">&lt;{o.email}&gt;</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{o.source}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Reports can only go to this client's own contacts. Each person receives a separate email.</p>
        </div>

        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Message <span className="text-gray-400">(optional, shown above the standard text)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={4000}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={attachWord} onChange={(e) => setAttachWord(e.target.checked)} disabled={!report?.draftAvailable} />
          Also attach the Word document (the PDF is always attached)
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Close
          </button>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || selected.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" /> {sendMutation.isPending ? 'Queuing…' : `Send to ${selected.length} recipient${selected.length === 1 ? '' : 's'}`}
          </button>
        </div>

        {deliveries.length > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sent history</p>
            <ul className="space-y-2">
              {deliveries.map((d) => (
                <li key={d.id} className="text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    {STATUS_ICON[d.status]}
                    <span className="font-medium text-gray-800 dark:text-gray-200">{d.status}</span>
                    <span>· {new Date(d.createdAt).toLocaleString()} by {d.sentByName ?? `user #${d.sentByUserId}`}</span>
                  </div>
                  <p className="ml-6">To: {d.recipients.join(', ')}{d.attachWord ? ' · PDF + Word' : ' · PDF'}</p>
                  {d.lastError && <p className="ml-6 text-red-600 dark:text-red-400">{d.lastError}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
