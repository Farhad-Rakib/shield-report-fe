import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { MenuItem } from '../../../domain/models/menu.model';
import { useSiteSettingsStore } from '../../../core/stores/site-settings.store';
import { useSidebarStore } from '../../../core/stores/sidebar.store';
import { buildNavEntries, findActiveTrail, useNavigationMenu } from '../navigation';
import { MenuIcon } from './MenuIcon';
import { BrandMark } from './BrandMark';

// Icon names → lucide components: see `iconMap` in ./menuIcons.ts (generic fallback for unknown names).

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { siteTitle } = useSiteSettingsStore();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  // Section groups default to expanded; this tracks the ones the user folded away.
  const [collapsedGroups, setCollapsedGroups] = useState<number[]>([]);
  // Nested (depth ≥ 2) sub-menus keep the old click-to-expand behaviour.
  const [expandedNested, setExpandedNested] = useState<number[]>([]);

  const menuItems = useNavigationMenu();
  const entries = buildNavEntries(menuItems);
  const { url: activeUrl } = findActiveTrail(menuItems, location.pathname);

  const displayTitle = siteTitle || 'ShieldReport';

  const toggleGroup = (id: number) =>
    setCollapsedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const toggleNested = (id: number) =>
    setExpandedNested((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const linkClass = (active: boolean, depth: number) =>
    `group relative flex items-center gap-2.5 rounded-md text-13 font-medium transition-colors ${
      isCollapsed ? 'lg:justify-center lg:px-0 h-9 px-2.5' : 'h-8 px-2.5'
    } ${depth > 1 && !isCollapsed ? 'ml-4' : ''} ${
      active
        ? 'bg-console-hover text-white'
        : 'text-console-muted hover:bg-console-raised hover:text-gray-100'
    }`;

  const renderLink = (item: MenuItem, depth: number) => {
    const active = !!item.url && item.url === activeUrl;
    return (
      <Link
        key={item.id}
        to={item.url!}
        onClick={onClose}
        title={isCollapsed ? item.title : undefined}
        aria-current={active ? 'page' : undefined}
        className={linkClass(active, depth)}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-400" aria-hidden="true" />
        )}
        <MenuIcon
          name={item.icon}
          className={`w-4 h-4 shrink-0 ${active ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`}
        />
        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.title}</span>
      </Link>
    );
  };

  const renderItem = (item: MenuItem, depth: number): React.ReactNode => {
    const children = item.children ?? [];
    if (children.length > 0) {
      const open = expandedNested.includes(item.id) || children.some((c) => c.url === activeUrl);
      return (
        <div key={item.id}>
          <button
            type="button"
            onClick={() => toggleNested(item.id)}
            title={isCollapsed ? item.title : undefined}
            aria-expanded={open}
            className={`${linkClass(false, depth)} w-full`}
          >
            <MenuIcon name={item.icon} className="w-4 h-4 shrink-0 text-gray-500 group-hover:text-gray-300" />
            <span className={`flex-1 text-left truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.title}</span>
            <span className={isCollapsed ? 'lg:hidden' : ''}>
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          </button>
          {open && <div className="mt-0.5 space-y-0.5">{children.map((c) => renderItem(c, depth + 1))}</div>}
        </div>
      );
    }
    if (!item.url) return null;
    return renderLink(item, depth);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-[2px] z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 ${isCollapsed ? 'lg:w-[60px]' : 'lg:w-60'} transform transition-[width,transform] duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col bg-console border-r border-console-border text-gray-300`}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div
          className={`flex items-center h-14 shrink-0 justify-between border-b border-console-border ${
            isCollapsed ? 'px-4 lg:px-0 lg:justify-center' : 'px-4'
          }`}
        >
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <BrandMark title={displayTitle} />
          </div>
          {isCollapsed && (
            <div className="hidden lg:block">
              <BrandMark compact />
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-console-raised"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className={`flex-1 overflow-y-auto py-3 ${isCollapsed ? 'px-3 lg:px-2' : 'px-3'}`}>
          {entries.map((entry, idx) => {
            if (entry.kind === 'link') {
              return (
                <div key={entry.item.id} className="mb-0.5">
                  {renderItem(entry.item, 0)}
                </div>
              );
            }

            const groupOpen = isCollapsed || !collapsedGroups.includes(entry.item.id);
            return (
              <div key={entry.item.id} className={idx === 0 ? '' : 'mt-4'}>
                {/* Collapsed rail shows a hairline instead of the heading */}
                {isCollapsed && <div className="hidden lg:block mx-2 mb-2 border-t border-console-border" />}
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.item.id)}
                  aria-expanded={groupOpen}
                  className={`group w-full flex items-center justify-between px-2.5 mb-1 h-6 rounded text-2xs font-semibold uppercase tracking-[0.1em] text-gray-500 hover:text-gray-300 transition-colors ${
                    isCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  <span className="truncate">{entry.item.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-transform ${
                      groupOpen ? '' : '-rotate-90 opacity-100'
                    }`}
                  />
                </button>
                {groupOpen && <div className="space-y-0.5">{entry.children.map((c) => renderItem(c, 1))}</div>}
              </div>
            );
          })}
        </nav>

        {/* Footer: quick search hint + collapse toggle */}
        <div
          className={`shrink-0 border-t border-console-border p-2 flex items-center ${
            isCollapsed ? 'justify-between lg:justify-center' : 'justify-between'
          }`}
        >
          <div className={`flex items-center gap-1.5 pl-1.5 text-2xs text-gray-500 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <kbd className="px-1.5 h-5 inline-flex items-center rounded border border-console-border bg-console-raised font-mono text-gray-400">
              Ctrl
            </kbd>
            <kbd className="px-1.5 h-5 inline-flex items-center rounded border border-console-border bg-console-raised font-mono text-gray-400">
              K
            </kbd>
            <span className="ml-0.5">Quick search</span>
          </div>
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex w-8 h-8 items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-console-raised transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
