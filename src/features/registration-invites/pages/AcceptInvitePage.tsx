import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from '../../../components/ui/Toast/toast.store';
import { Loader } from '../../../components/ui/Loader/Loader';
import { registrationInviteApi } from '../../../core/api/services/registration-invite.api';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ['invite-validation', token],
    queryFn: () => registrationInviteApi.validateByToken(token!),
    enabled: !!token,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: () => registrationInviteApi.completeByToken(token!, { fullName, password }),
    onSuccess: () => {
      toast.success('Registration complete! You can now sign in.');
      navigate('/login', { replace: true });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to complete registration'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    completeMutation.mutate();
  };

  if (isLoading) return <Loader />;

  if (error || !invite) {
    return (
      <div className="text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Invalid or Expired</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">This invitation link is no longer valid. Ask whoever invited you to send a new one.</p>
        <Link to="/login" className="inline-block text-sm text-blue-600 hover:underline">Back to Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Registration</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {invite.email} — joining as <span className="font-medium">{invite.roleName}</span>
          {invite.clientOrganizationName && <> at <span className="font-medium">{invite.clientOrganizationName}</span></>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={completeMutation.isPending}
            placeholder="Jane Doe"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={completeMutation.isPending}
            placeholder="Choose a password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={completeMutation.isPending}
            placeholder="Re-enter your password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={completeMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {completeMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Complete Registration
        </button>
      </form>
    </div>
  );
};
