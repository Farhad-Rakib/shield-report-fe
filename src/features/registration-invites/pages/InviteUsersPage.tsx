import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy } from 'lucide-react';
import { DataTable, Column, RowAction } from '../../../components/table/DataTable';
import { Modal } from '../../../components/ui/Modal/Modal';
import { toast } from '../../../components/ui/Toast/toast.store';
import { BaseRepository } from '../../../core/api/base.repository';
import { ApiResponse } from '../../../domain/dto/auth.dto';
import { registrationInviteApi } from '../../../core/api/services/registration-invite.api';
import { clientOrganizationApi } from '../../../core/api/services/client-organization.api';
import { RegistrationInvite, InviteLifetime, InviteStatus } from '../../../domain/models/registration-invite.model';

interface RoleDto {
  id: number;
  name: string;
}

class RolesListApi extends BaseRepository {
  constructor() { super('/roles'); }
  async getAll(): Promise<RoleDto[]> {
    const res = await this.get<ApiResponse<RoleDto[]>>('');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }
}
const rolesListApi = new RolesListApi();

const CLIENT_FACING_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER'];

const LIFETIME_OPTIONS: { label: string; value: InviteLifetime }[] = [
  { label: '24 hours', value: 'TwentyFourHours' },
  { label: '7 days', value: 'SevenDays' },
  { label: '30 days', value: 'ThirtyDays' },
];

const statusStyles: Record<InviteStatus, string> = {
  Pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Consumed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Revoked: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const InviteUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [clientOrganizationId, setClientOrganizationId] = useState<number | ''>('');
  const [lifetime, setLifetime] = useState<InviteLifetime>('SevenDays');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['registration-invites'],
    queryFn: () => registrationInviteApi.getInvites(),
  });
  const invites = data?.data ?? [];

  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => rolesListApi.getAll(),
  });

  const { data: orgData } = useQuery({
    queryKey: ['client-organizations-picker'],
    queryFn: () => clientOrganizationApi.getOrganizations({ pageSize: 100 }),
  });
  const organizations = orgData?.data ?? [];

  const selectedRole = roles.find((r) => r.id === roleId);
  const requiresClientOrganization = !!selectedRole && CLIENT_FACING_ROLES.includes(selectedRole.name);

  const resetForm = () => {
    setEmail('');
    setRoleId('');
    setClientOrganizationId('');
    setLifetime('SevenDays');
  };

  const createMutation = useMutation({
    mutationFn: () =>
      registrationInviteApi.createInvite({
        email,
        roleId: Number(roleId),
        clientOrganizationId: requiresClientOrganization ? Number(clientOrganizationId) : null,
        lifetime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-invites'] });
      toast.success('Invite sent successfully');
      setShowInviteModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to create invite'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => registrationInviteApi.revokeInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-invites'] });
      toast.success('Invite revoked');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to revoke invite'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !roleId || (requiresClientOrganization && !clientOrganizationId)) return;
    createMutation.mutate();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Registration link copied to clipboard');
  };

  const columns: Column<RegistrationInvite>[] = [
    { key: 'email', label: 'Email' },
    { key: 'roleName', label: 'Role' },
    { key: 'clientOrganizationName', label: 'Client Org', render: (_, invite) => invite.clientOrganizationName || <span className="text-xs text-gray-400">—</span> },
    {
      key: 'status',
      label: 'Status',
      render: (_, invite) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusStyles[invite.status]}`}>{invite.status}</span>
      ),
    },
    {
      key: 'expiresAtUtc',
      label: 'Expires',
      render: (_, invite) => <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(invite.expiresAtUtc).toLocaleString()}</span>,
    },
  ];

  const rowActions: RowAction<RegistrationInvite>[] = [
    {
      icon: Copy,
      label: 'Copy registration link',
      onClick: (invite) => invite.token && copyLink(invite.token),
      variant: 'secondary',
      show: (invite) => invite.status === 'Pending' && !!invite.token,
    },
    {
      icon: Ban,
      label: 'Revoke',
      onClick: (invite) => revokeMutation.mutate(invite.id),
      variant: 'danger',
      show: (invite) => invite.status === 'Pending',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registration Invites</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Invite staff or client contacts to register an account</p>
      </div>

      <DataTable
        columns={columns}
        data={invites}
        isLoading={isLoading}
        error={error?.message}
        searchable={false}
        emptyState={{ title: 'No invites found', description: 'Invite someone to get started' }}
        actions={{ add: { label: 'Invite User', onClick: () => setShowInviteModal(true) } }}
        rowActions={rowActions}
        onRetry={() => refetch()}
      />

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite User" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
            <select
              required
              value={roleId}
              onChange={(e) => {
                setRoleId(Number(e.target.value));
                setClientOrganizationId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {requiresClientOrganization && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Organization *</label>
              <select
                required
                value={clientOrganizationId}
                onChange={(e) => setClientOrganizationId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              {organizations.length === 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">No client organizations registered yet.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invite expires in</label>
            <select
              value={lifetime}
              onChange={(e) => setLifetime(e.target.value as InviteLifetime)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIFETIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
