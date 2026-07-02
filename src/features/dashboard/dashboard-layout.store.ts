import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';

export const ALL_WIDGET_IDS = [
  // PentestOps KPI row
  'kpi-total-clients',
  'kpi-total-engagements',
  'kpi-total-assets',
  'kpi-open-vulnerabilities',
  'kpi-critical-vulnerabilities',
  'kpi-active-scans',
  // PentestOps charts + table
  'widget-vulnerabilities-by-severity-chart',
  'widget-engagements-by-status-chart',
  'widget-recent-activity-table',
  // Original RBAC-admin KPI row
  'kpi-total-users',
  'kpi-active-users',
  'kpi-total-roles',
  'kpi-total-permissions',
  // Original RBAC-admin charts + table
  'widget-users-by-role-chart',
  'widget-registrations-trend-chart',
  'widget-recent-users-table',
] as const;

export type WidgetId = (typeof ALL_WIDGET_IDS)[number];

interface UserLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}

interface DashboardLayoutState {
  layouts: Record<string, UserLayout>;
  getLayout: (userId: string) => UserLayout;
  reorder: (userId: string, activeId: WidgetId, overId: WidgetId) => void;
  hide: (userId: string, widgetId: WidgetId) => void;
  reset: (userId: string) => void;
  /** Called on mount after fetching layout from the server. Server wins over localStorage. */
  syncFromServer: (userId: string, order: WidgetId[], hidden: WidgetId[]) => void;
}

const defaultLayout = (): UserLayout => ({
  order: [...ALL_WIDGET_IDS],
  hidden: [],
});

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      layouts: {},

      getLayout: (userId) => {
        return get().layouts[userId] ?? defaultLayout();
      },

      reorder: (userId, activeId, overId) => {
        const current = get().layouts[userId] ?? defaultLayout();
        const oldIndex = current.order.indexOf(activeId);
        const newIndex = current.order.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        set(state => ({
          layouts: {
            ...state.layouts,
            [userId]: {
              ...current,
              order: arrayMove(current.order, oldIndex, newIndex),
            },
          },
        }));
      },

      hide: (userId, widgetId) => {
        const current = get().layouts[userId] ?? defaultLayout();
        if (current.hidden.includes(widgetId)) return;
        set(state => ({
          layouts: {
            ...state.layouts,
            [userId]: {
              ...current,
              hidden: [...current.hidden, widgetId],
            },
          },
        }));
      },

      reset: (userId) => {
        set(state => ({
          layouts: {
            ...state.layouts,
            [userId]: defaultLayout(),
          },
        }));
      },

      syncFromServer: (userId, order, hidden) => {
        // Validate incoming IDs — only keep known widget IDs to avoid stale data
        const validOrder  = order.filter((id): id is WidgetId => (ALL_WIDGET_IDS as readonly string[]).includes(id));
        const validHidden = hidden.filter((id): id is WidgetId => (ALL_WIDGET_IDS as readonly string[]).includes(id));

        // Append any new widget IDs that weren't in the server-saved order (added after the user last saved)
        const missing = ALL_WIDGET_IDS.filter(id => !validOrder.includes(id));
        const mergedOrder: WidgetId[] = [...validOrder, ...missing];

        set(state => ({
          layouts: {
            ...state.layouts,
            [userId]: { order: mergedOrder, hidden: validHidden },
          },
        }));
      },
    }),
    {
      // Bumped to v2 — added the new PentestOps widget set alongside the original RBAC-admin
      // one. A v1-persisted `order` predates these IDs entirely, so reset to defaultLayout()
      // (which includes both sets) rather than have them silently missing until server sync.
      name: 'shield_report_dashboard_layouts_v2',
    }
  )
);
