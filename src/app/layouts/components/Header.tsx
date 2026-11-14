import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, Sun, Moon, ChevronRight, ChevronDown } from 'lucide-react';
// Bell, Check, Trash2 — only used by the notification bell, commented out below.
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { useThemeStore } from '../../../core/stores/theme.store';
// import { useNotificationStore, Notification } from '../../../core/stores/notification.store';
import { userApi } from '../../../core/api/services/user.api';
import { findActiveTrail, useNavigationMenu } from '../navigation';

// Breadcrumb fallback for routes that are not in the menu (e.g. /engagements/12, /profile).
const fallbackCrumbs = (pathname: string): string[] => {
  const parts = pathname.split('/').filter((p) => p && !/^\d+$/.test(p) && !/^[0-9a-f-]{16,}$/i.test(p));
  if (parts.length === 0) return ['Dashboard'];
  return parts.map((p) => p.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()));
};

interface HeaderProps {
  onMenuClick: () => void;
}

// Notification bell — commented out for now (see the render block further down for why).
/*
const formatTimeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const typeStyles: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const NotificationItem: React.FC<{
  n: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ n, onRead, onRemove }) => (
  <div
    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
      !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
    }`}
    onClick={() => !n.read && onRead(n.id)}
  >
    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${typeStyles[n.type]}`} />
    <div className="flex-1 min-w-0">
      <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
        {n.title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{n.message}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTimeAgo(n.timestamp)}</p>
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(n.id); }}
      className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-1"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);
*/

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useNavigationMenu();
  const { isAuthenticated, tokenPayload, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  // const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  // const [showNotifications, setShowNotifications] = useState(false);
  // const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const displayName = profile?.fullName || tokenPayload?.name || tokenPayload?.email || 'User';
  const displayRole = profile?.roles?.[0] || tokenPayload?.role || tokenPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
  const initials = displayName
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const { trail } = findActiveTrail(menuItems, location.pathname);
  const crumbs = trail.length > 0 ? trail : fallbackCrumbs(location.pathname);
  const envLabel = import.meta.env.DEV ? 'Local' : 'Production';

  return (
    <header className="h-14 shrink-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden btn-icon -ml-1"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page context */}
        <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
          <ol className="flex items-center gap-1.5 text-13 min-w-0">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c}-${i}`} className={`flex items-center gap-1.5 min-w-0 ${last ? '' : 'hidden sm:flex'}`}>
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600 hidden sm:block" />}
                  <span
                    className={`truncate ${
                      last ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                    }`}
                    aria-current={last ? 'page' : undefined}
                  >
                    {c}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-1">
          <span
            className="hidden md:inline-flex items-center gap-1.5 h-6 px-2 mr-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-2xs font-medium text-gray-600 dark:text-gray-400"
            title="Environment"
          >
            <span className={`status-dot ${import.meta.env.DEV ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="font-mono uppercase tracking-wider">{envLabel}</span>
          </span>

          <button
            onClick={toggleTheme}
            className="btn-icon"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification bell — commented out for now.
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-center text-gray-400">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <NotificationItem key={n.id} n={n} onRead={markAsRead} onRemove={removeNotification} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          */}

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1.5" aria-hidden="true" />

          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              className="flex items-center gap-2.5 h-9 pl-1 pr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
            >
              {profile?.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt={displayName} className="w-7 h-7 rounded-md object-cover ring-1 ring-gray-200 dark:ring-gray-700" />
              ) : (
                <div className="w-7 h-7 rounded-md bg-gray-900 dark:bg-gray-800 ring-1 ring-inset ring-gray-900/10 dark:ring-gray-700 flex items-center justify-center">
                  <span className="text-brand-300 text-2xs font-semibold font-mono">{initials}</span>
                </div>
              )}
              <div className="hidden md:block text-left leading-tight">
                <p className="text-13 font-medium text-gray-900 dark:text-gray-100 max-w-[10rem] truncate">{displayName}</p>
                {displayRole && <p className="text-2xs text-gray-500 dark:text-gray-400 capitalize">{displayRole}</p>}
              </div>
              <ChevronDown className="hidden md:block w-3.5 h-3.5 text-gray-400" />
            </button>

            {showUserMenu && (
              <div role="menu" className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-gray-900 rounded-lg shadow-overlay border border-gray-200 dark:border-gray-800 py-1 z-20">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 md:hidden">
                  <p className="text-13 font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                  {displayRole && <p className="text-2xs text-gray-500 dark:text-gray-400 capitalize">{displayRole}</p>}
                </div>
                <button
                  role="menuitem"
                  onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-13 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="w-4 h-4" /> Profile
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-13 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
