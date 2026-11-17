import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, Send } from 'lucide-react';
import { toast } from '../../../components/ui/Toast/toast.store';
import { emailSettingsApi } from '../../../core/api/services/email-settings.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { EmailSettings, UpdateEmailSettings } from '../../../domain/models/email-settings.model';

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string };
const errorMessage = (err: unknown, fallback: string) => {
  const e = err as ApiError | undefined;
  const fieldErrors = e?.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(' ') : '';
  return fieldErrors || e?.response?.data?.message || e?.message || fallback;
};

type Draft = Omit<UpdateEmailSettings, 'password'> & { password: string };

const toDraft = (s: EmailSettings): Draft => ({
  host: s.host,
  port: s.port,
  useSsl: s.useSsl,
  username: s.username,
  password: '',
  fromAddress: s.fromAddress,
  fromName: s.fromName,
});

// Common ports: 587 = STARTTLS (SSL on), 465 = implicit TLS (not supported by .NET SmtpClient),
// 25 = plain relay.
const PORT_HINTS: Record<number, string> = {
  587: 'Submission with STARTTLS. Keep "Use SSL/TLS" on.',
  25: 'Plain relay. Usually only works inside your own network.',
  465: 'Implicit TLS (port 465) is not supported. Use 587 with SSL/TLS on.',
};

// Outgoing mail for every email the app sends: registration invites, password resets and
// report delivery.
export const EmailSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const myEmail = useAuthStore((s) => s.tokenPayload?.email ?? '');
  const { data, isLoading, error } = useQuery({ queryKey: ['email-settings'], queryFn: () => emailSettingsApi.getSettings() });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [clearPassword, setClearPassword] = useState(false);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    if (data) {
      setDraft(toDraft(data));
      setClearPassword(false);
    }
  }, [data]);

  useEffect(() => {
    if (!testTo && myEmail) setTestTo(myEmail);
  }, [myEmail, testTo]);

  const saved = data ? toDraft(data) : null;
  const dirty = !!draft && !!saved && (JSON.stringify(draft) !== JSON.stringify(saved) || clearPassword);

  const save = useMutation({
    mutationFn: () =>
      emailSettingsApi.update({
        ...draft!,
        // Blank keeps the stored password unless "remove" is ticked.
        password: clearPassword ? '' : draft!.password ? draft!.password : null,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['email-settings'], result);
      toast.success('Email settings saved');
    },
    onError: (err: unknown) => toast.error(errorMessage(err, 'Failed to save email settings')),
  });

  const test = useMutation({
    mutationFn: () => emailSettingsApi.sendTest(testTo.trim()),
    onSuccess: (message) => toast.success(message || 'Test email sent'),
    onError: (err: unknown) => toast.error(errorMessage(err, 'Test email failed')),
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Administration</p>
          <h1 className="page-title flex items-center gap-2">
            <Mail className="w-5 h-5" /> Email Configuration
          </h1>
          <p className="page-subtitle">
            The SMTP server used for every email the app sends: registration invites, password resets and report delivery.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(error, 'Failed to load email settings')}</p>}

      {draft && data && (
        <>
          {!data.isConfigured && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Not configured yet. Until you save this form, emails use the server's <code className="code-chip">SMTP_*</code> settings if any are set, and fail otherwise.
            </div>
          )}

          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="panel-header">
              <div>
                <h2 className="panel-title">SMTP server</h2>
                {data.updatedAt && <p className="panel-subtitle">Last saved {new Date(data.updatedAt).toLocaleString()}</p>}
              </div>
            </div>
            <div className="panel-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                <label className="block">
                  <span className="label">Host</span>
                  <input className="input" required value={draft.host} placeholder="smtp.office365.com" onChange={(e) => set({ host: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Port</span>
                  <input className="input" type="number" required min={1} max={65535} value={draft.port} onChange={(e) => set({ port: Number(e.target.value) })} />
                </label>
              </div>
              {PORT_HINTS[draft.port] && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">{PORT_HINTS[draft.port]}</p>}

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={draft.useSsl} onChange={(e) => set({ useSsl: e.target.checked })} />
                Use SSL/TLS (STARTTLS)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Username</span>
                  <input className="input" autoComplete="off" value={draft.username} placeholder="Leave empty if the server needs no sign-in" onChange={(e) => set({ username: e.target.value })} />
                </label>
                <div>
                  <label className="block">
                    <span className="label">Password</span>
                    <input
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      disabled={clearPassword}
                      value={draft.password}
                      placeholder={data.hasPassword ? '•••••••• (stored, leave blank to keep)' : 'Not set'}
                      onChange={(e) => set({ password: e.target.value })}
                    />
                  </label>
                  {data.hasPassword && (
                    <label className="mt-1.5 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={clearPassword} onChange={(e) => setClearPassword(e.target.checked)} />
                      Remove the stored password
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">From address</span>
                  <input className="input" type="email" required value={draft.fromAddress} placeholder="no-reply@yourcompany.com" onChange={(e) => set({ fromAddress: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">From name</span>
                  <input className="input" value={draft.fromName} maxLength={150} placeholder="ShieldReport" onChange={(e) => set({ fromName: e.target.value })} />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">The password is stored encrypted and is never shown again after saving.</p>
            </div>
            <div className="panel-footer flex justify-end gap-2">
              <button type="button" className="btn-secondary" disabled={!dirty || save.isPending} onClick={() => saved && (setDraft(saved), setClearPassword(false))}>
                Discard changes
              </button>
              <button type="submit" className="btn-primary" disabled={!dirty || save.isPending}>
                <Save className="w-4 h-4" /> {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Send a test email</h2>
                <p className="panel-subtitle">Uses the saved settings. Save your changes first.</p>
              </div>
            </div>
            <form
              className="panel-body flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                test.mutate();
              }}
            >
              <label className="block flex-1 min-w-[240px]">
                <span className="label">Recipient</span>
                <input className="input" type="email" required value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              </label>
              <button type="submit" className="btn-secondary" disabled={test.isPending || dirty || !testTo.trim()} title={dirty ? 'Save your changes first' : undefined}>
                <Send className="w-4 h-4" /> {test.isPending ? 'Sending…' : 'Send test email'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
