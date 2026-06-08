import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UpdateWebhookTemplateDto } from './dto/update-template.dto';

export type ChannelType = 'email' | 'google_chat' | 'custom_webhook';
export type WebhookEventId = 'E001' | 'E002' | 'E003' | 'E005' | 'E006';

const CHANNEL_TYPES: ChannelType[] = ['email', 'google_chat', 'custom_webhook'];
const WEBHOOK_EVENT_IDS: WebhookEventId[] = ['E001', 'E002', 'E003', 'E005', 'E006'];

// Default message templates — used when no row exists in DB yet.
const DEFAULT_TEMPLATES: Record<WebhookEventId, string> = {
  E001: 'Tờ trình {code} - "{title}" từ {submitter} đang chờ {recipient} thẩm định.\nLink: {link}',
  E002: 'Tờ trình {code} - "{title}" đã được thẩm định, đang chờ {recipient} phê duyệt.\nLink: {link}',
  E003: 'Tờ trình {code} - "{title}" của {submitter} đã được phê duyệt.\nLink: {link}',
  E005: 'Tờ trình {code} - "{title}" bị {decider} từ chối thẩm định.\nLý do: {reason}\nLink: {link}',
  E006: 'Tờ trình {code} - "{title}" bị {decider} từ chối phê duyệt.\nLý do: {reason}\nLink: {link}',
};

export interface IWebhookPayload {
  event: WebhookEventId;
  submissionCode: string;
  submissionTitle: string;
  submissionUrl: string;
  recipientName: string;
  submitterName: string;
  triggeredAt: string; // ISO
  deciderName?: string;  // E005/E006: người từ chối
  reason?: string;       // E005/E006: lý do từ chối
  submitterUsername?: string;
  recipientUsername?: string;
}

@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private assertValidType(type: string): asserts type is ChannelType {
    if (!CHANNEL_TYPES.includes(type as ChannelType)) {
      throw new BadRequestException(`Loại kênh thông báo không hợp lệ: ${type}`);
    }
  }

  async findAll() {
    const rows = await this.prisma.notificationChannel.findMany({
      orderBy: { type: 'asc' },
    });
    // Ensure all 3 channels are returned, even if a row is missing.
    const byType = new Map(rows.map((r) => [r.type, r]));
    return CHANNEL_TYPES.map(
      (type) =>
        byType.get(type) ?? {
          type,
          isEnabled: type === 'email',
          webhookUrl: null,
          logUpdatedAt: new Date(),
          logUpdatedBy: null,
        },
    );
  }

  async update(type: string, dto: UpdateChannelDto, updatedBy: string) {
    this.assertValidType(type);

    const webhookUrl = dto.webhookUrl?.trim() || null;

    if (type !== 'email' && dto.isEnabled && !webhookUrl) {
      throw new BadRequestException('Vui lòng nhập Webhook URL trước khi bật kênh này.');
    }

    return this.prisma.notificationChannel.upsert({
      where: { type },
      create: {
        type,
        isEnabled: dto.isEnabled,
        webhookUrl: type === 'email' ? null : webhookUrl,
        logUpdatedBy: updatedBy,
      },
      update: {
        isEnabled: dto.isEnabled,
        webhookUrl: type === 'email' ? null : webhookUrl,
        logUpdatedBy: updatedBy,
      },
    });
  }

  async test(
    type: string,
    overrideUrl?: string | null,
  ): Promise<{ success: boolean; error?: string }> {
    this.assertValidType(type);

    const samplePayload: IWebhookPayload = {
      event: 'E001',
      submissionCode: 'MS-TEST',
      submissionTitle: '[Tin thử] Tờ trình mẫu',
      submissionUrl: `${(process.env.CORS_ORIGIN ?? 'http://localhost:5418').replace(/\/$/, '')}/submissions/test`,
      recipientName: 'Người dùng thử nghiệm',
      submitterName: 'Người gửi thử nghiệm',
      triggeredAt: new Date().toISOString(),
      submitterUsername: 'nguoi_gui_thu',
      recipientUsername: 'nguoi_nhan_thu',
    };

    if (type === 'email') {
      // Email channel uses SMTP config already validated elsewhere — return success regardless of toggle.
      return { success: true };
    }

    // Prefer the URL provided in the test request (current draft from the form);
    // fall back to the persisted value so saved channels can still be tested.
    let url = overrideUrl?.trim() || null;
    if (!url) {
      const channel = await this.prisma.notificationChannel.findUnique({ where: { type } });
      url = channel?.webhookUrl ?? null;
    }
    if (!url) {
      return { success: false, error: 'Chưa cấu hình Webhook URL.' };
    }

    return this.dispatchToWebhook(type, url, samplePayload);
  }

  /**
   * Send a notification to all enabled webhook channels.
   * Email channel is intentionally NOT handled here — emails are queued through EmailQueue separately.
   * Errors are logged, never thrown — webhook delivery is best-effort.
   */
  async dispatchToEnabledWebhooks(payload: IWebhookPayload): Promise<void> {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { isEnabled: true, type: { in: ['google_chat', 'custom_webhook'] } },
    });

    await Promise.all(
      channels.map(async (c) => {
        if (!c.webhookUrl) return;
        const result = await this.dispatchToWebhook(c.type as ChannelType, c.webhookUrl, payload);
        if (!result.success) {
          this.logger.warn(`Webhook delivery failed [${c.type}]: ${result.error}`);
        }
      }),
    );
  }

  /** Returns whether the email channel is currently enabled. */
  async isEmailEnabled(): Promise<boolean> {
    const c = await this.prisma.notificationChannel.findUnique({ where: { type: 'email' } });
    // Default ON when row missing (matches seed).
    return c?.isEnabled ?? true;
  }

  // ─── Webhook message templates (§6.8) ─────────────────────────────────────

  private assertValidEvent(eventId: string): asserts eventId is WebhookEventId {
    if (!WEBHOOK_EVENT_IDS.includes(eventId as WebhookEventId)) {
      throw new BadRequestException(`Mã sự kiện không hợp lệ: ${eventId}`);
    }
  }

  async getTemplate(eventId: string) {
    this.assertValidEvent(eventId);
    const row = await this.prisma.webhookMessageTemplate.findUnique({ where: { eventId } });
    return (
      row ?? {
        eventId,
        message: DEFAULT_TEMPLATES[eventId],
        logUpdatedAt: new Date(),
        logUpdatedBy: null,
      }
    );
  }

  async listTemplates() {
    const rows = await this.prisma.webhookMessageTemplate.findMany({ orderBy: { eventId: 'asc' } });
    const byEvent = new Map(rows.map((r) => [r.eventId, r]));
    return WEBHOOK_EVENT_IDS.map(
      (eventId) =>
        byEvent.get(eventId) ?? {
          eventId,
          message: DEFAULT_TEMPLATES[eventId],
          logUpdatedAt: new Date(),
          logUpdatedBy: null,
        },
    );
  }

  async updateTemplate(eventId: string, dto: UpdateWebhookTemplateDto, updatedBy: string) {
    this.assertValidEvent(eventId);
    return this.prisma.webhookMessageTemplate.upsert({
      where: { eventId },
      create: { eventId, message: dto.message, logUpdatedBy: updatedBy },
      update: { message: dto.message, logUpdatedBy: updatedBy },
    });
  }

  private async renderMessage(payload: IWebhookPayload): Promise<string> {
    const tpl = await this.getTemplate(payload.event);
    const vars: Record<string, string> = {
      code: payload.submissionCode,
      title: payload.submissionTitle,
      submitter: payload.submitterName,
      recipient: payload.recipientName,
      link: payload.submissionUrl,
      ...(payload.deciderName !== undefined && { decider: payload.deciderName }),
      ...(payload.reason !== undefined && { reason: payload.reason }),
      ...(payload.submitterUsername !== undefined && { submitter_username: payload.submitterUsername }),
      ...(payload.recipientUsername !== undefined && { recipient_username: payload.recipientUsername }),
    };
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
      tpl.message,
    );
  }

  // ─── Webhook dispatch ─────────────────────────────────────────────────────

  private async dispatchToWebhook(
    type: ChannelType,
    url: string,
    payload: IWebhookPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const message = await this.renderMessage(payload);
    const body = { text: message };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export { CHANNEL_TYPES, WEBHOOK_EVENT_IDS, DEFAULT_TEMPLATES };
