import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Server, Bug, Radar, LogOut, Menu, X, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';
import { engagementApi } from '../../core/api/services/engagement.api';

const NAV_ITEMS = [
  { label: 'Engagements', href: '/portal/engagements', icon: Briefcase },
  { label: 'Assets', href: '/portal/assets', icon: Server },
  { label: 'Vulnerabilities', href: '/portal/vulnerabilities', icon: Bug },
  { label: 'Scans', href: '/portal/scans', icon: Radar },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{orgName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block text-right ml-2 mr-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
        )}

        <aside
          className={`fixed lg:static inset-y-0 left-0 top-16 lg:top-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}
        >
          <div className="flex items-center justify-end p-3 lg:hidden">
            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
