import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  useNotificationChannels,
  useUpdateNotificationChannel,
  useTestNotificationChannel,
  useWebhookTemplates,
  useUpdateWebhookTemplate,
} from '@/hooks/useNotificationChannels';
import type {
  INotificationChannel,
  NotificationChannelType,
  WebhookEventId,
} from '@/api/notificationChannels.api';

const WEBHOOK_EVENTS: Array<{ id: WebhookEventId; label: string }> = [
  { id: 'E001', label: 'E001 — Cần thẩm định' },
  { id: 'E002', label: 'E002 — Cần phê duyệt' },
  { id: 'E003', label: 'E003 — Đã được phê duyệt' },
  { id: 'E005', label: 'E005 — Từ chối thẩm định' },
  { id: 'E006', label: 'E006 — Từ chối phê duyệt' },
];

const TEMPLATE_VARS: Array<{ key: string; desc: string }> = [
  { key: '{code}', desc: 'Mã tờ trình' },
  { key: '{title}', desc: 'Tiêu đề tờ trình' },
  { key: '{submitter}', desc: 'Người gửi' },
  { key: '{recipient}', desc: 'Người nhận thông báo' },
  { key: '{link}', desc: 'Link tờ trình' },
];

interface IChannelMeta {
  type: NotificationChannelType;
  title: string;
  description: string;
  needsUrl: boolean;
  urlPlaceholder?: string;
}

const CHANNEL_META: IChannelMeta[] = [
  {
    type: 'email',
    title: 'Email',
    description: 'Dùng cấu hình SMTP hiện có. Không cần cấu hình thêm.',
    needsUrl: false,
  },
  {
    type: 'google_chat',
    title: 'Google Chat Webhook',
    description: 'Server tự chuyển payload sang định dạng Google Chat trước khi gửi.',
    needsUrl: true,
    urlPlaceholder: 'https://chat.googleapis.com/v1/spaces/...',
  },
  {
    type: 'custom_webhook',
    title: 'Custom Webhook',
    description: 'POST JSON payload mẫu (xem §6.8) đến URL cấu hình.',
    needsUrl: true,
    urlPlaceholder: 'https://hooks.example.com/notify',
  },
];

interface IChannelDraft {
  isEnabled: boolean;
  webhookUrl: string;
}

type DraftMap = Record<NotificationChannelType, IChannelDraft>;

function toDraft(channels: INotificationChannel[]): DraftMap {
  const map: Partial<DraftMap> = {};
  for (const meta of CHANNEL_META) {
    const found = channels.find((c) => c.type === meta.type);
    map[meta.type] = {
      isEnabled: found?.isEnabled ?? (meta.type === 'email'),
      webhookUrl: found?.webhookUrl ?? '',
    };
  }
  return map as DraftMap;
}

export function NotificationChannelsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useNotificationChannels();
  const updateMutation = useUpdateNotificationChannel();
  const testMutation = useTestNotificationChannel();
  const { data: templates, isLoading: isLoadingTemplates } = useWebhookTemplates();
  const updateTemplateMutation = useUpdateWebhookTemplate();

  const [drafts, setDrafts] = useState<DraftMap | null>(null);
  const [templateDrafts, setTemplateDrafts] = useState<Record<WebhookEventId, string> | null>(null);

  useEffect(() => {
    if (data) setDrafts(toDraft(data));
  }, [data]);

  useEffect(() => {
    if (templates) {
      const map: Partial<Record<WebhookEventId, string>> = {};
      for (const e of WEBHOOK_EVENTS) {
        map[e.id] = templates.find((t) => t.eventId === e.id)?.message ?? '';
      }
      setTemplateDrafts(map as Record<WebhookEventId, string>);
    }
  }, [templates]);

  const isDirty = useMemo(() => {
    if (!drafts || !data) return false;
    const original = toDraft(data);
    const channelDirty = CHANNEL_META.some((m) => {
      const a = drafts[m.type];
      const b = original[m.type];
      return a.isEnabled !== b.isEnabled || a.webhookUrl !== b.webhookUrl;
    });
    if (channelDirty) return true;
    if (!templateDrafts || !templates) return false;
    return WEBHOOK_EVENTS.some((e) => {
      const original = templates.find((t) => t.eventId === e.id)?.message ?? '';
      return (templateDrafts[e.id] ?? '') !== original;
    });
  }, [drafts, data, templateDrafts, templates]);

  if (isLoading || !drafts || isLoadingTemplates || !templateDrafts) {
    return <p className="p-6 text-sm text-muted-foreground">Đang tải cấu hình kênh thông báo…</p>;
  }

  const setDraft = (type: NotificationChannelType, patch: Partial<IChannelDraft>) =>
    setDrafts((prev) => (prev ? { ...prev, [type]: { ...prev[type], ...patch } } : prev));

  const setTemplateDraft = (eventId: WebhookEventId, message: string) =>
    setTemplateDrafts((prev) => (prev ? { ...prev, [eventId]: message } : prev));

  async function handleSave() {
    if (!drafts || !templateDrafts) return;
    try {
      for (const meta of CHANNEL_META) {
        const d = drafts[meta.type];
        await updateMutation.mutateAsync({
          type: meta.type,
          data: {
            isEnabled: d.isEnabled,
            webhookUrl: meta.needsUrl ? d.webhookUrl.trim() || null : null,
          },
        });
      }
      for (const e of WEBHOOK_EVENTS) {
        const message = templateDrafts[e.id]?.trim();
        if (!message) continue;
        const original = templates?.find((t) => t.eventId === e.id)?.message ?? '';
        if (message === original) continue;
        await updateTemplateMutation.mutateAsync({ eventId: e.id, message });
      }
      toast({ title: 'Đã lưu cấu hình kênh thông báo' });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: getApiErrorMessage(error, 'Không thể lưu cấu hình kênh thông báo'),
        variant: 'destructive',
      });
    }
  }

  async function handleTest(type: NotificationChannelType) {
    try {
      const webhookUrl = drafts?.[type]?.webhookUrl.trim() || undefined;
      const res = await testMutation.mutateAsync({ type, webhookUrl });
      if (res.success) {
        toast({ title: 'Gửi thử thành công' });
      } else {
        toast({
          title: 'Gửi thử thất bại',
          description: res.error ?? 'Không rõ lỗi',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Gửi thử thất bại',
        description: getApiErrorMessage(error, 'Không thể gửi tin thử'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Kênh thông báo cần duyệt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Áp dụng cho: E001 Cần thẩm định, E002 Cần phê duyệt, E003 Đã được phê duyệt, E005 Từ chối thẩm định, E006 Từ chối phê duyệt.
          Các kênh đang bật sẽ được gửi đồng thời.
        </p>
      </div>

      <div className="space-y-3">
        {CHANNEL_META.map((meta) => {
          const draft = drafts[meta.type];
          return (
            <section
              key={meta.type}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">{meta.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isEnabled}
                  onClick={() => setDraft(meta.type, { isEnabled: !draft.isEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    draft.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      draft.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {meta.needsUrl && (
                <div className="space-y-1.5">
                  <Label htmlFor={`url-${meta.type}`}>Webhook URL</Label>
                  <Input
                    id={`url-${meta.type}`}
                    type="url"
                    placeholder={meta.urlPlaceholder}
                    value={draft.webhookUrl}
                    onChange={(e) => setDraft(meta.type, { webhookUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleTest(meta.type)}
                  disabled={
                    testMutation.isPending ||
                    !draft.isEnabled ||
                    (meta.needsUrl && !draft.webhookUrl.trim())
                  }
                >
                  {testMutation.isPending && testMutation.variables?.type === meta.type
                    ? 'Đang gửi…'
                    : 'Gửi thử'}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="border border-border rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Nội dung tin nhắn</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Template dùng chung cho tất cả webhook (Google Chat &amp; Custom). Email dùng cấu hình
            template riêng tại{' '}
            <strong>Cấu hình email template</strong>.
          </p>
        </div>

        <div className="rounded-md bg-muted/30 border border-border px-3 py-2 text-xs">
          <p className="font-medium text-foreground mb-1">Biến hợp lệ:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
            {TEMPLATE_VARS.map((v) => (
              <li key={v.key}>
                <code className="text-foreground">{v.key}</code> — {v.desc}
              </li>
            ))}
          </ul>
        </div>

        {WEBHOOK_EVENTS.map((e) => (
          <div key={e.id} className="space-y-1.5">
            <Label htmlFor={`tpl-${e.id}`}>{e.label}</Label>
            <Textarea
              id={`tpl-${e.id}`}
              rows={4}
              value={templateDrafts[e.id] ?? ''}
              onChange={(ev) => setTemplateDraft(e.id, ev.target.value)}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </section>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={!isDirty || updateMutation.isPending || updateTemplateMutation.isPending}
        >
          {updateMutation.isPending || updateTemplateMutation.isPending
            ? 'Đang lưu…'
            : 'Lưu cấu hình'}
        </Button>
      </div>
    </div>
  );
}
