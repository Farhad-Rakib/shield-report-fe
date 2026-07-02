import { useQuery } from '@tanstack/react-query';
import { Calendar, UserRound } from 'lucide-react';
import { Loader } from '../../../components/ui/Loader/Loader';
import { ErrorState } from '../../../components/ui/ErrorState/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { EngagementStatusBadge } from '../../../components/badges/PentestBadges';
import { engagementApi } from '../../../core/api/services/engagement.api';
import { Engagement, EngagementStatus } from '../../../domain/models/engagement.model';

// Active work surfaces first — a client opening the tracker cares about what's in flight,
// not the full chronological list.
const STATUS_ORDER: Record<EngagementStatus, number> = {
  InProgress: 0,
  InReview: 1,
  Scheduled: 2,
  Completed: 3,
};

export const PortalEngagementsPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-engagements'],
    queryFn: () => engagementApi.getEngagements({ pageSize: 50 }),
  });

  const engagements = [...(data?.data ?? [])].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} retry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Engagement Tracker</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Your active and past pentest engagements</p>
      </div>

      {engagements.length === 0 ? (
        <EmptyState title="No engagements yet" description="Your pentest team will set up an engagement here once work begins." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {engagements.map((engagement: Engagement) => (
            <div
              key={engagement.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">{engagement.title}</h2>
                <EngagementStatusBadge status={engagement.status} />
              </div>

              {engagement.scope && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{engagement.scope}</p>
              )}

              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                {engagement.startDate ? new Date(engagement.startDate).toLocaleDateString() : '—'}
                {' → '}
                {engagement.endDate ? new Date(engagement.endDate).toLocaleDateString() : '—'}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <UserRound className="w-4 h-4" />
                Pentester: <span className="text-gray-700 dark:text-gray-300">{engagement.leadPentesterName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
