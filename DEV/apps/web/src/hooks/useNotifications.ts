import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  NOTIFICATIONS_QUERY_KEY,
  type INotification,
  type INotificationsResponse,
} from '@/api/notifications.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/hooks/use-toast';

const BELL_LIMIT = 30;
const BELL_QUERY_KEY = [NOTIFICATIONS_QUERY_KEY, 'bell'] as const;

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: BELL_QUERY_KEY,
    queryFn: () => getNotifications({ page: 1, limit: BELL_LIMIT }),
    enabled: !!user?.staffId,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // WebSocket connection — push new notifications into the bell cache and
  // invalidate the inbox so an open inbox tab refreshes too.
  useEffect(() => {
    if (!user?.staffId) return;

    const socket = io('/notifications', {
      withCredentials: true,
      query: { staffId: user.staffId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('notification', (notification: INotification) => {
      if (notification.link?.startsWith('/login?reason=auto-logout')) {
        clearUser();
        toast({
          title: notification.title,
          description: notification.body,
          duration: 5000,
        });
        window.location.replace(notification.link);
        return;
      }

      queryClient.setQueryData<INotificationsResponse>(BELL_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [notification, ...old.data].slice(0, BELL_LIMIT),
          unreadCount: old.unreadCount + 1,
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1,
          },
        };
      });
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'inbox'] });

      toast({
        title: notification.title,
        description: notification.body.length > 100
          ? notification.body.slice(0, 100) + '…'
          : notification.body,
        duration: 5000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [clearUser, queryClient, user?.staffId]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });

  const handleMarkAsRead = useCallback(
    (id: string) => markAsReadMutation.mutateAsync(id),
    [markAsReadMutation],
  );

  const handleMarkAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead,
  };
}
