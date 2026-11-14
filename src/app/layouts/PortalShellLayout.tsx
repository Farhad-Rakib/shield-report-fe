import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Server, Bug, Radar, LogOut, Menu, X, Sun, Moon, ShieldCheck, FileText } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';
import { engagementApi } from '../../core/api/services/engagement.api';

const NAV_ITEMS = [
  { label: 'Engagements', href: '/portal/engagements', icon: Briefcase },
  { label: 'Assets', href: '/portal/assets', icon: Server },
  { label: 'Vulnerabilities', href: '/portal/vulnerabilities', icon: Bug },
  { label: 'Scans', href: '/portal/scans', icon: Radar },
  { label: 'Reports', href: '/portal/reports', icon: FileText },
];

export const PortalShellLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { tokenPayload, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // No org-name claim is issued in the JWT (only the numeric clientOrganizationId) and
  // client-portal roles aren't granted ClientsRead (that endpoint has no [ClientScope], so
  // granting it would let a client read any other org's record) — so the display name is
  // pulled from data the portal already has legitimate, org-scoped access to.
  const { data: engagementsData } = useQuery({
    queryKey: ['portal-org-name-probe'],
    queryFn: () => engagementApi.getEngagements({ pageSize: 1 }),
  });
  const orgName = engagementsData?.data[0]?.clientOrganizationName ?? 'Client Portal';

  const displayName = (tokenPayload?.name as string) || (tokenPayload?.email as string) || 'Client';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col">
      <header className="h-14 shrink-0 bg-console border-b border-console-border sticky top-0 z-30">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-1.5 -ml-1 rounded-md text-gray-400 hover:text-white hover:bg-console-raised"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 ring-1 ring-inset ring-white/20 shrink-0">
              <ShieldCheck className="w-[18px] h-[18px] text-gray-950" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-sm font-semibold text-white truncate">{orgName}</h1>
              <p className="text-2xs font-mono uppercase tracking-[0.14em] text-brand-400">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-console-raised transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden sm:block w-px h-5 bg-console-border mx-1.5" aria-hidden="true" />
            <div className="hidden sm:block text-right mr-1">
              <p className="text-13 font-medium text-gray-200 max-w-[14rem] truncate">{displayName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-400 hover:bg-console-raised transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isOpen && (
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setIsOpen(false)} />
        )}

        <aside
          className={`fixed lg:static inset-y-0 left-0 top-14 lg:top-0 z-50 w-60 transform transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } flex flex-col bg-console border-r border-console-border`}
          aria-label="Portal navigation"
        >
          <div className="flex items-center justify-end p-2 lg:hidden">
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation"
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-console-raised"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-3">
            <p className="px-2.5 mb-1 h-6 flex items-center text-2xs font-semibold uppercase tracking-[0.1em] text-gray-500">
              Security posture
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 h-8 px-2.5 text-13 font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-console-hover text-white'
                        : 'text-console-muted hover:bg-console-raised hover:text-gray-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-400" aria-hidden="true" />
                      )}
                      <item.icon
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="shrink-0 border-t border-console-border px-4 py-3 text-2xs text-gray-500">
            Powered by <span className="text-gray-300 font-medium">ShieldReport</span>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
