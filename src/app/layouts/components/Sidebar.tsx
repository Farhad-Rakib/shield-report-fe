import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, X, Command } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { menuApi } from '../../../core/api/services/menu.api';
import { MenuItem } from '../../../domain/models/menu.model';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { useSiteSettingsStore } from '../../../core/stores/site-settings.store';
import { useSidebarStore } from '../../../core/stores/sidebar.store';
import { AppConfig } from '../../../core/config/app.config';

const iconMap: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  users: 'Users',
  roles: 'Shield',
  rolepermissions: 'ShieldCheck',
  'role-permissions': 'ShieldCheck',
  permissions: 'Key',
  'user-roles': 'UserCheck',
  settings: 'Settings',
  reports: 'FileText',
  'chart-bar': 'BarChart3',
  activity: 'Activity',
  home: 'Home',
  products: 'Package',
  orders: 'ShoppingCart',
  analytics: 'TrendingUp',
  notifications: 'Bell',
  calendar: 'Calendar',
  messages: 'MessageSquare',
  profile: 'User',
  preferences: 'Sliders',
  menu: 'Menu',
  'site-settings': 'Settings',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { tokenPayload } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { siteTitle } = useSiteSettingsStore();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();

  const displayTitle = siteTitle || AppConfig.app.name;

  const isSuperAdmin = tokenPayload?.role === 'SuperAdmin' ||
    tokenPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'SuperAdmin';

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu', isSuperAdmin ? 'all' : 'filtered'],
    queryFn: () => isSuperAdmin ? menuApi.getAllMenuItems() : menuApi.getMenuItems(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const getIcon = (iconName?: string | null) => {
    if (!iconName) return null;
    const mapped = iconMap[iconName.toLowerCase()] || iconName;
    const Icon = (Icons as any)[mapped];
    return Icon ? <Icon className="w-5 h-5" /> : null;
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.url === location.pathname;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpand(item.title)}
            title={isCollapsed ? item.title : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isExpanded
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={{ paddingLeft: isCollapsed ? undefined : `${1 + depth * 0.75}rem` }}
          >
            <div className="flex items-center gap-3">
              {getIcon(item.icon)}
              {!isCollapsed && <span>{item.title}</span>}
            </div>
            {!isCollapsed && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
          </button>
          {isExpanded && !isCollapsed && (
            <div className="mt-1 space-y-1">
              {item.children!.map((child) => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    if (!item.url) return null;

    return (
      <Link
        key={item.id}
        to={item.url}
        onClick={onClose}
        title={isCollapsed ? item.title : undefined}
        className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: isCollapsed ? undefined : `${1 + depth * 0.75}rem` }}
      >
        {getIcon(item.icon)}
        {!isCollapsed && <span>{item.title}</span>}
      </Link>
    );
  };

  // Filter: only show top-level items that have children or a URL
  // Deduplicate: items appearing inside a parent should not also appear at top level
  const childIds = new Set<number>();
  menuItems.forEach(item => {
    if (item.children) {
      item.children.forEach(child => childIds.add(child.id));
    }
  });
  const dedupedItems = menuItems.filter(item =>
    !childIds.has(item.id) && ((item.children && item.children.length > 0) || item.url)
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}
      >
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3 top-5 z-10 w-6 h-6 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className={`flex items-center h-16 justify-between ${isCollapsed ? 'px-2' : 'px-4'} border-b border-gray-200 dark:border-gray-800`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-blue-600">
              <Command className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {displayTitle}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {dedupedItems.map((item) => renderMenuItem(item))}
        </nav>

        {!isCollapsed && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <kbd className="px-1.5 py-0.5 rounded font-medium bg-gray-100 dark:bg-gray-800">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 rounded font-medium bg-gray-100 dark:bg-gray-800">K</kbd>
              <span className="ml-1">Quick Search</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
