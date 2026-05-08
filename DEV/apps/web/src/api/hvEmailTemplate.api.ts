import { apiClient } from '@/lib/axios';

export interface IHvEmailTemplate {
  eventId: string;
  label: string;
  description: string;
  variables: string[];
  subject: string;
  body: string;
}

type ApiWrap<T> = { success: boolean; data: T };

export const hvEmailTemplateApi = {
  list: () =>
    apiClient.get<ApiWrap<IHvEmailTemplate[]>>('/system/email-templates').then((r) => r.data.data),

  get: (eventId: string) =>
    apiClient.get<ApiWrap<IHvEmailTemplate>>(`/system/email-templates/${eventId}`).then((r) => r.data.data),

  update: (eventId: string, data: { subject: string; body: string }) =>
    apiClient.put<ApiWrap<{ message: string }>>(`/system/email-templates/${eventId}`, data).then((r) => r.data),
};
