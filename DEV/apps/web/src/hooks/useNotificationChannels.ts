import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationChannelsApi,
  type IUpdateChannelInput,
  type NotificationChannelType,
  type WebhookEventId,
} from '@/api/notificationChannels.api';

const KEY = 'notification-channels';

export function useNotificationChannels() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => notificationChannelsApi.list(),
  });
}

export function useUpdateNotificationChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, data }: { type: NotificationChannelType; data: IUpdateChannelInput }) =>
      notificationChannelsApi.update(type, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useTestNotificationChannel() {
  return useMutation({
    mutationFn: ({ type, webhookUrl }: { type: NotificationChannelType; webhookUrl?: string }) =>
      notificationChannelsApi.test(type, webhookUrl),
  });
}

const TEMPLATE_KEY = 'webhook-templates';

export function useWebhookTemplates() {
  return useQuery({
    queryKey: [TEMPLATE_KEY],
    queryFn: () => notificationChannelsApi.listTemplates(),
  });
}

export function useUpdateWebhookTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, message }: { eventId: WebhookEventId; message: string }) =>
      notificationChannelsApi.updateTemplate(eventId, { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATE_KEY] }),
  });
}
