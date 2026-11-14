import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ArrowLeft, Mail } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { isClientPortalUser } from '../../../core/guards/portal.guard';
import { toast } from '../../../components/ui/Toast/toast.store';
import { AppConfig } from '../../../core/config/app.config';
import { AuthService } from '../../../core/services/impl/auth.service';

const authService = new AuthService();

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Explicit `from` (a deep link the user was bounced from) always wins; otherwise land
  // client-portal users in their own portal rather than the staff dashboard.
  const explicitFrom = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials);
      toast.success('Login successful!');
      const tokenPayload = useAuthStore.getState().tokenPayload;
      const fallback = isClientPortalUser(tokenPayload) ? '/portal' : AppConfig.auth.defaultRedirect;
      navigate(explicitFrom || fallback, { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const msg = await authService.forgotPassword({ email: forgotEmail });
      toast.success(msg || 'Password reset link sent to your email');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Forgot Password</h2>
          <p className="mt-1 text-13 text-gray-500 dark:text-gray-400">
            Enter your email address and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="label">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              disabled={forgotLoading}
              className="input input-lg"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={forgotLoading || !forgotEmail}
            className="btn-primary w-full h-10 text-sm"
          >
            {forgotLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Reset Link
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => setShowForgotPassword(false)}
          className="btn-ghost mt-3 w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Welcome back</h2>
        <p className="mt-1 text-13 text-gray-500 dark:text-gray-400">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            required
            disabled={isLoading}
            className="input input-lg"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="label mb-0">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 rounded-sm transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            required
            disabled={isLoading}
            className="input input-lg"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full h-10 text-sm"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </button>
      </form>
    </div>
  );
};
