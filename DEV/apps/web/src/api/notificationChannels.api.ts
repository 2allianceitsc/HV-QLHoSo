import { apiClient } from '@/lib/axios';

type ApiWrap<T> = { success: boolean; data: T };

export type NotificationChannelType = 'email' | 'google_chat' | 'custom_webhook';

export interface INotificationChannel {
  type: NotificationChannelType;
  isEnabled: boolean;
  webhookUrl: string | null;
  logUpdatedAt: string;
  logUpdatedBy: string | null;
}

export interface IUpdateChannelInput {
  isEnabled: boolean;
  webhookUrl?: string | null;
}

export interface ITestChannelResult {
  success: boolean;
  error?: string;
}

export type WebhookEventId = 'E001' | 'E002';

export interface IWebhookMessageTemplate {
  eventId: WebhookEventId;
  message: string;
  logUpdatedAt: string;
  logUpdatedBy: string | null;
}

export const notificationChannelsApi = {
  list: () =>
    apiClient
      .get<ApiWrap<INotificationChannel[]>>('/system/notification-channels')
      .then((r) => r.data.data),

  update: (type: NotificationChannelType, data: IUpdateChannelInput) =>
    apiClient
      .put<ApiWrap<INotificationChannel>>(`/system/notification-channels/${type}`, data)
      .then((r) => r.data.data),

  test: (type: NotificationChannelType, webhookUrl?: string) =>
    // Test endpoint already returns { success, error? }; the global ResponseInterceptor
    // passes it through unwrapped (only adds durationMs), so read r.data directly.
    apiClient
      .post<ITestChannelResult & { durationMs?: number }>(
        `/system/notification-channels/${type}/test`,
        webhookUrl ? { webhookUrl } : {},
      )
      .then((r) => ({ success: r.data.success, error: r.data.error })),

  // ── Webhook message templates (§6.8) ──
  listTemplates: () =>
    apiClient
      .get<ApiWrap<IWebhookMessageTemplate[]>>('/system/webhook-templates')
      .then((r) => r.data.data),

  updateTemplate: (eventId: WebhookEventId, data: { message: string }) =>
    apiClient
      .put<ApiWrap<IWebhookMessageTemplate>>(`/system/webhook-templates/${eventId}`, data)
      .then((r) => r.data.data),
};
