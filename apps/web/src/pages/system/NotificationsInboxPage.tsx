import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDetailModal } from '@/components/modals/NotificationDetailModal';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  NOTIFICATIONS_QUERY_KEY,
  type INotification,
} from '@/api/notifications.api';
import { getApiErrorMessage } from '@/lib/apiError';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const INBOX_QUERY_KEY = [NOTIFICATIONS_QUERY_KEY, 'inbox'] as const;
const PAGE_SIZE = 20;

const TYPE_BADGE_CLASS: Record<INotification['type'], string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  alert: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
};

export function NotificationsInboxPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<INotification | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...INBOX_QUERY_KEY, page],
    queryFn: () => getNotifications({ page, limit: PAGE_SIZE }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Failed to mark notification as read'),
        variant: 'destructive',
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      toast({ title: 'All notifications marked as read' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Failed to mark all notifications as read'),
        variant: 'destructive',
      });
    },
  });

  const totalPages = useMemo(() => {
    const pages = data?.pagination.totalPages ?? 1;
    return pages > 0 ? pages : 1;
  }, [data?.pagination.totalPages]);

  async function handleOpen(notification: INotification) {
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    setSelected(notification);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            View all in-app notifications delivered to your account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={(data?.unreadCount ?? 0) === 0 || markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-2 text-3xl font-bold">{data?.pagination.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unread</p>
          <p className="mt-2 text-3xl font-bold">{data?.unreadCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Page</p>
          <p className="mt-2 text-3xl font-bold">{page}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading notifications...</div>
        ) : !data?.data.length ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No notifications found.</div>
        ) : (
          <div className="divide-y divide-border">
            {data.data.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleOpen(notification)}
                className={cn(
                  'w-full px-6 py-4 text-left transition-colors hover:bg-accent/50',
                  !notification.isRead && 'bg-primary/5',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('capitalize', TYPE_BADGE_CLASS[notification.type])}>
                        {notification.type}
                      </Badge>
                      {!notification.isRead && <Badge variant="outline">Unread</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.logCreatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div>
                      <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.logCreatedAt), 'PPpp')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-primary">Open</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {selected && (
        <NotificationDetailModal
          notification={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
