import { TestingType, TESTING_TYPE_LABELS } from '../../../domain/models/engagement.model';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { Modal } from '../../../components/ui/Modal/Modal';
import { DynamicForm, FormField } from '../../../components/form/DynamicForm';
import { toast } from '../../../components/ui/Toast/toast.store';
import { FilterCard, useListFilters } from '../../../components/ui/FilterCard/FilterCard';
import { EngagementStatusBadge } from '../../../components/badges/PentestBadges';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { staffUserApi } from '../../../core/api/services/staff-user.api';
import { Engagement } from '../../../domain/models/engagement.model';
import { CreateEngagementRequestDto } from '../../../domain/dto/engagement.dto';

export const EngagementsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const filters = useListFilters();
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
  });
  const organizations = orgData?.data ?? [];

  // A page number valid for one filter combination can be out of range for another.
  useEffect(() => {
    setPage(1);
  }, [filters.params]);

  const { data: usersData } = useQuery({
    queryKey: ['staff-users-picker'],
    queryFn: () => staffUserApi.getAll(),
  });
  const pentesters = (usersData ?? []).filter((u) => u.roles.includes('PENTESTER'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['engagements', filters.params, page, pageSize],
    queryFn: () => engagementApi.getEngagements({ ...filters.params, page, pageSize }),
  });
  const engagements = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateEngagementRequestDto) => engagementApi.createEngagement(dto),
    onSuccess: (engagement) => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      toast.success('Engagement created successfully');
      setShowAddModal(false);
      navigate(`/engagements/${engagement.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create engagement'),
  });

  const createFields: FormField[] = [
    {
      name: 'clientOrganizationId',
      label: 'Client Organization',
      type: 'select',
      required: true,
      defaultValue: filters.values.clientOrganizationId,
      options: organizations.map((org) => ({ label: org.name, value: String(org.id) })),
    },
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
      clientOrganizationId: Number(data.clientOrganizationId),
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
    { key: 'clientOrganizationName', label: 'Client' },
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
      </div>

      <FilterCard values={filters.values} onChange={filters.setValues} onReset={filters.reset} dateLabel="Active" />

      <DataTable
        columns={columns}
        data={engagements}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No engagements found', description: filters.isActive ? 'No engagements match these filters' : 'Create an engagement to get started' }}
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
