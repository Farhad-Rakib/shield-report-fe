import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Users, UserCheck, ShieldCheck, KeyRound, RotateCcw, Save, Building2, Briefcase, Server, ShieldAlert, Skull, Radar } from 'lucide-react';

import { AppConfig } from '../../../core/config/app.config';
import { dashboardApi } from '../../../core/api/services/dashboard.api';
import { userDashboardLayoutApi } from '../../../core/api/services/user-dashboard-layout.api';

import { useDashboardLayoutStore, type WidgetId } from '../dashboard-layout.store';

import { KpiCard } from '../components/KpiCard';
import { UsersByRoleChart } from '../components/UsersByRoleChart';
import { RegistrationsTrendChart } from '../components/RegistrationsTrendChart';
import { RecentUsersTable } from '../components/RecentUsersTable';
import { VulnerabilitiesBySeverityChart } from '../components/VulnerabilitiesBySeverityChart';
import { EngagementsByStatusChart } from '../components/EngagementsByStatusChart';
import { RecentActivityTable } from '../components/RecentActivityTable';
import { DashboardFilterBar } from '../components/DashboardFilterBar';
import { DraggableWidget, DragOverlayWidget } from '../components/DraggableWidget';

import { useAuthStore } from '../../auth/store/auth.store';

export function DashboardPage() {
  const tokenPayload = useAuthStore(s => s.tokenPayload);
  const userId = String(tokenPayload?.sub ?? tokenPayload?.['id'] ?? 'guest');

  const { getLayout, reorder, hide, reset, syncFromServer } = useDashboardLayoutStore();
  const { order, hidden } = getLayout(userId);

  const [activeDragId, setActiveDragId] = useState<WidgetId | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const visibleIds = order.filter(id => !hidden.includes(id));
  const isCompact = (id: WidgetId) => id.startsWith('kpi-');

  // ── Filters ────────────────────────────────────────────────────────────
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const resetFilters = () => { setClientOrganizationId(''); setFrom(''); setTo(''); };

  // ── Data ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', clientOrganizationId, from, to],
    queryFn: () => dashboardApi.getSummary({
      clientOrganizationId: clientOrganizationId ? Number(clientOrganizationId) : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    staleTime: 5 * 60 * 1000,
  });

  // ── DB layout sync ─────────────────────────────────────────────────────
  const { data: serverLayout } = useQuery({
    queryKey: ['dashboard-layout', userId],
    queryFn: () => userDashboardLayoutApi.getLayout(),
    staleTime: Infinity,
    enabled: userId !== 'guest',
  });

  const syncedRef = useRef(false);
  useEffect(() => {
    if (serverLayout && !syncedRef.current) {
      syncedRef.current = true;
      syncFromServer(userId, serverLayout.widgetOrder as WidgetId[], serverLayout.hiddenWidgets as WidgetId[]);
    }
  }, [serverLayout, userId, syncFromServer]);

  const saveMutation = useMutation({
    mutationFn: (payload: { widgetOrder: string[]; hiddenWidgets: string[] }) =>
      userDashboardLayoutApi.saveLayout(payload),
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const saveNow = useCallback(() => {
    const layout = useDashboardLayoutStore.getState().getLayout(userId);
    saveMutation.mutate({ widgetOrder: layout.order, hiddenWidgets: layout.hidden });
  }, [userId, saveMutation]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    if (AppConfig.dashboard.autoSave) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(saveNow, AppConfig.dashboard.autoSaveDelayMs);
    }
  }, [saveNow]);

  // ── Dnd-kit ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(active.id as WidgetId);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      reorder(userId, active.id as WidgetId, over.id as WidgetId);
      markDirty();
    }
  };

  // ── Widget renderer ────────────────────────────────────────────────────
  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'kpi-total-users':
        return <KpiCard title="Total Users" value={data?.totalUsers ?? 0} icon={Users} color="blue" href="/users" loading={isLoading} />;
      case 'kpi-active-users':
        return <KpiCard title="Active Users" value={data?.activeUsers ?? 0} icon={UserCheck} color="emerald" href="/users" loading={isLoading} />;
      case 'kpi-total-roles':
        return <KpiCard title="Total Roles" value={data?.totalRoles ?? 0} icon={ShieldCheck} color="indigo" href="/roles" loading={isLoading} />;
      case 'kpi-total-permissions':
        return <KpiCard title="Total Permissions" value={data?.totalPermissions ?? 0} icon={KeyRound} color="purple" href="/permissions" loading={isLoading} />;
      case 'widget-users-by-role-chart':
        return <UsersByRoleChart data={data?.usersByRole ?? []} loading={isLoading} />;
      case 'widget-registrations-trend-chart':
        return <RegistrationsTrendChart data={data?.registrationsTrend ?? []} loading={isLoading} />;
      case 'widget-recent-users-table':
        return <RecentUsersTable users={data?.recentUsers ?? []} loading={isLoading} />;
      case 'kpi-total-clients':
        return <KpiCard title="Total Clients" value={data?.totalClients ?? 0} icon={Building2} color="blue" href="/clients" loading={isLoading} />;
      case 'kpi-total-engagements':
        return <KpiCard title="Total Engagements" value={data?.totalEngagements ?? 0} icon={Briefcase} color="indigo" href="/engagements" loading={isLoading} />;
      case 'kpi-total-assets':
        return <KpiCard title="Total Assets" value={data?.totalAssets ?? 0} icon={Server} color="purple" href="/assets" loading={isLoading} />;
      case 'kpi-open-vulnerabilities':
        return <KpiCard title="Open Vulnerabilities" value={data?.openVulnerabilities ?? 0} icon={ShieldAlert} color="amber" href="/vulnerabilities" loading={isLoading} />;
      case 'kpi-critical-vulnerabilities':
        return <KpiCard title="Critical Vulnerabilities" value={data?.criticalVulnerabilities ?? 0} icon={Skull} color="red" href="/vulnerabilities" loading={isLoading} />;
      case 'kpi-active-scans':
        return <KpiCard title="Active Scans" value={data?.activeScans ?? 0} icon={Radar} color="emerald" href="/scans" loading={isLoading} />;
      case 'widget-vulnerabilities-by-severity-chart':
        return <VulnerabilitiesBySeverityChart data={data?.vulnerabilitiesBySeverity ?? []} loading={isLoading} />;
      case 'widget-engagements-by-status-chart':
        return <EngagementsByStatusChart data={data?.engagementsByStatus ?? []} loading={isLoading} />;
      case 'widget-recent-activity-table':
        return <RecentActivityTable activity={data?.recentActivity ?? []} loading={isLoading} />;
      default:
        return null;
    }
  };

  const removedWidgetIds = order.filter(id => hidden.includes(id));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Drag to reorder • hover a widget to see controls
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { reset(userId); markDirty(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Restore default layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset layout
          </button>
          {!AppConfig.dashboard.autoSave && (
            <button
              onClick={saveNow}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed'
              }`}
              title="Save dashboard layout"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? 'Saving…' : 'Save layout'}
            </button>
          )}
        </div>
      </div>

      <DashboardFilterBar
        clientOrganizationId={clientOrganizationId}
        onClientChange={setClientOrganizationId}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        onReset={resetFilters}
      />

      {removedWidgetIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <span className="text-xs text-gray-500 dark:text-gray-400">Hidden:</span>
          {removedWidgetIds.map(id => (
            <button
              key={id}
              onClick={() => {
                const layout = getLayout(userId);
                useDashboardLayoutStore.setState(state => ({
                  layouts: {
                    ...state.layouts,
                    [userId]: { ...layout, hidden: layout.hidden.filter(h => h !== id) },
                  },
                }));
                markDirty();
              }}
              className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + {id.replace(/^(kpi-|widget-)/, '').replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
          <WidgetGrid
            visibleIds={visibleIds}
            isCompact={isCompact}
            onHide={(id) => { hide(userId, id); markDirty(); }}
            renderContent={renderWidgetContent}
          />
        </SortableContext>

        <DragOverlay>
          {activeDragId ? (
            <DragOverlayWidget>
              {renderWidgetContent(activeDragId)}
            </DragOverlayWidget>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── WidgetGrid ─────────────────────────────────────────────────────────────
// Groups consecutive compact (KPI) widgets into responsive grid rows,
// renders non-compact widgets as full-width blocks.
interface WidgetGridProps {
  visibleIds: WidgetId[];
  isCompact: (id: WidgetId) => boolean;
  onHide: (id: WidgetId) => void;
  renderContent: (id: WidgetId) => React.ReactNode;
}

function WidgetGrid({ visibleIds, isCompact, onHide, renderContent }: WidgetGridProps) {
  const segments: Array<{ type: 'grid'; ids: WidgetId[] } | { type: 'block'; id: WidgetId }> = [];
  for (const id of visibleIds) {
    if (isCompact(id)) {
      const last = segments[segments.length - 1];
      if (last?.type === 'grid') {
        last.ids.push(id);
      } else {
        segments.push({ type: 'grid', ids: [id] });
      }
    } else {
      segments.push({ type: 'block', id });
    }
  }

  return (
    <div className="space-y-4">
      {segments.map((seg, i) =>
        seg.type === 'grid' ? (
          <div key={i} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {seg.ids.map(id => (
              <DraggableWidget key={id} id={id} onHide={onHide}>
                {renderContent(id)}
              </DraggableWidget>
            ))}
          </div>
        ) : (
          <DraggableWidget key={seg.id} id={seg.id} onHide={onHide}>
            {renderContent(seg.id)}
          </DraggableWidget>
        )
      )}
    </div>
  );
}
