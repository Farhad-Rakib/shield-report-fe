import { TestingType, TESTING_TYPE_LABELS } from '../../../domain/models/engagement.model';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { EngagementStatusBadge } from '../../../components/badges/PentestBadges';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { staffUserApi } from '../../../core/api/services/staff-user.api';
import { Engagement } from '../../../domain/models/engagement.model';
import { CreateEngagementRequestDto } from '../../../domain/dto/engagement.dto';

export const EngagementsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [clientOrganizationId, setClientOrganizationId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
  });
  const organizations = orgData?.data ?? [];

  useEffect(() => {
    if (clientOrganizationId === null && organizations.length > 0) {
      setClientOrganizationId(organizations[0].id);
    }
  }, [organizations, clientOrganizationId]);

  useEffect(() => {
    setPage(1);
  }, [clientOrganizationId]);

  const { data: usersData } = useQuery({
    queryKey: ['staff-users-picker'],
    queryFn: () => staffUserApi.getAll(),
  });
  const pentesters = (usersData ?? []).filter((u) => u.roles.includes('PENTESTER'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['engagements', clientOrganizationId, page, pageSize],
    queryFn: () => engagementApi.getEngagements({ clientOrganizationId: clientOrganizationId!, page, pageSize }),
    enabled: clientOrganizationId !== null,
  });
  const engagements = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateEngagementRequestDto) => engagementApi.createEngagement(dto),
    onSuccess: (engagement) => {
      queryClient.invalidateQueries({ queryKey: ['engagements', clientOrganizationId] });
      toast.success('Engagement created successfully');
      setShowAddModal(false);
      navigate(`/engagements/${engagement.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create engagement'),
  });

  const createFields: FormField[] = [
    { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Q3 External Pentest' },
    {
      name: 'leadPentesterId',
      label: 'Pentester',
      type: 'select',
      required: true,
      options: pentesters.map((p) => ({ label: p.fullName, value: p.id })),
    },
    { name: 'scope', label: 'Scope', type: 'textarea', placeholder: 'In-scope assets, exclusions, rules of engagement...' },
    { name: 'startDate', label: 'Start Date', type: 'text', placeholder: 'YYYY-MM-DD' },
    { name: 'endDate', label: 'End Date', type: 'text', placeholder: 'YYYY-MM-DD' },
    {
      name: 'testingType',
      label: 'Testing Type (report wording)',
      type: 'select',
      required: true,
      defaultValue: 'White',
      options: (Object.keys(TESTING_TYPE_LABELS) as TestingType[]).map((t) => ({ label: TESTING_TYPE_LABELS[t], value: t })),
    },
  ];

  const handleCreate = (data: Record<string, any>) => {
    createMutation.mutate({
      clientOrganizationId: clientOrganizationId!,
      title: data.title,
      leadPentesterId: Number(data.leadPentesterId),
      scope: data.scope || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      testingType: (data.testingType as TestingType) || 'White',
    });
  };

  const columns: Column<Engagement>[] = [
    { key: 'title', label: 'Title' },
    { key: 'leadPentesterName', label: 'Pentester' },
    { key: 'status', label: 'Status', render: (_, e) => <EngagementStatusBadge status={e.status} /> },
    {
      key: 'startDate',
      label: 'Start',
      render: (_, e) => <span className="text-sm text-gray-600 dark:text-gray-400">{e.startDate ? new Date(e.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'endDate',
      label: 'End',
      render: (_, e) => <span className="text-sm text-gray-600 dark:text-gray-400">{e.endDate ? new Date(e.endDate).toLocaleDateString() : '—'}</span>,
    },
    { key: 'assignees', label: 'Team', render: (_, e) => <span className="text-sm text-gray-600 dark:text-gray-400">{e.assignees.length} assigned</span> },
  ];

  const rowActions: RowAction<Engagement>[] = [
    { icon: Eye, label: 'View', onClick: (e) => navigate(`/engagements/${e.id}`), variant: 'secondary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Engagements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Scope and track pentest engagements per client</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Organization</label>
          {organizations.length === 0 ? (
            <Link to="/clients" className="text-sm text-blue-600 hover:underline">
              Register a client organization first
            </Link>
          ) : (
            <select
              value={clientOrganizationId ?? ''}
              onChange={(e) => setClientOrganizationId(Number(e.target.value))}
              className="w-56 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={engagements}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No engagements found', description: 'Create an engagement for this client organization to get started' }}
        actions={{ add: { label: 'New Engagement', onClick: () => setShowAddModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
        pagination={{
          currentPage: data?.page ?? page,
          totalPages: data?.totalPages ?? 1,
          pageSize: data?.pageSize ?? pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Engagement" size="md">
        <DynamicForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="Create Engagement"
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>
    </div>
  );
};
