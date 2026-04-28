import { apiClient } from '@/lib/axios';

export const NOTIFICATIONS_QUERY_KEY = 'notifications';

export interface INotification {
  id: string;
  staffId: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'alert';
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  logCreatedAt: string;
}

export interface INotificationsResponse {
  data: INotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getNotifications = (params?: { page?: number; limit?: number }) =>
  apiClient
    .get<{ success: boolean; data: INotificationsResponse }>('/notifications', { params })
    .then((r) => r.data.data);

export const markAsRead = (id: string) =>
  apiClient.put<INotification>(`/notifications/${id}/read`).then((r) => r.data);

export const markAllAsRead = () =>
  apiClient.put<{ success: boolean }>('/notifications/read-all').then((r) => r.data);
