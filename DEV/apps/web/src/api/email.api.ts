import { apiClient } from '@/lib/axios';

export interface IEmailQueueItem {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  retryCount: number;
  note?: string | null;
  lastError?: string | null;
  sentAt?: string | null;
  scheduledAt: string;
  logCreatedAt: string;
}

export interface IEmailQueueResponse {
  items: IEmailQueueItem[];
  total: number;
  page: number;
  limit: number;
}

export interface IEmailJobStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastRunCount: number;
  stats: Record<string, number>;
}

export interface IEmailTemplate {
  type: string;
  key: string;
  description: string;
  html: string;
}

export interface IEmailQueueFilter {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  subject?: string;
  startDate?: string;
  endDate?: string;
}

export async function getEmailQueue(filter: IEmailQueueFilter = {}): Promise<IEmailQueueResponse> {
  const params: Record<string, unknown> = { page: filter.page ?? 1, limit: filter.limit ?? 20 };
  if (filter.status) params.status = filter.status;
  if (filter.type) params.type = filter.type;
  if (filter.subject) params.subject = filter.subject;
  if (filter.startDate) params.startDate = filter.startDate;
  if (filter.endDate) params.endDate = filter.endDate;
  const res = await apiClient.get<{ success: boolean; data: IEmailQueueResponse }>('/email-queue', { params });
  return res.data.data;
}

export async function retryEmail(id: string): Promise<void> {
  await apiClient.patch(`/email-queue/${id}/retry`);
}

export async function getEmailJobStatus(): Promise<IEmailJobStatus> {
  const res = await apiClient.get('/email-job/status');
  return (res.data as { success: boolean; data: IEmailJobStatus }).data;
}

export async function triggerEmailJob(): Promise<void> {
  await apiClient.post('/email-job/trigger');
}

export async function toggleEmailJob(enabled: boolean): Promise<void> {
  await apiClient.post('/email-job/toggle', { enabled });
}

export async function getEmailTemplates(): Promise<IEmailTemplate[]> {
  const res = await apiClient.get('/email-templates');
  return (res.data as { success: boolean; data: IEmailTemplate[] }).data;
}

export async function updateEmailTemplate(type: string, html: string): Promise<void> {
  await apiClient.put(`/email-templates/${type}`, { html });
}
