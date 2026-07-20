import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { PrismaService } from '../prisma/prisma.service';

type EmailProvider = 'smtp' | 'sendgrid' | string;

interface EmailProviderConfig {
  id: string;
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  // SMTP-specific (parsed from config JSON)
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  // API-based providers
  providerApiKey: string;
}

@Injectable()
export class EmailJobService {
  private readonly logger = new Logger(EmailJobService.name);
  private providerConfigCache: EmailProviderConfig | null = null;
  private providerCachedAt = 0;
  private readonly PROVIDER_CACHE_TTL = 30_000; // 30s
  private ignoredRecipientMarkersCache: string[] | null = null;
  private ignoredRecipientMarkersCachedAt = 0;
  private readonly IGNORED_MARKERS_CACHE_TTL = 30_000; // 30s
  private readonly DEFAULT_IGNORED_EMAIL_MARKERS = ['test', 'dev'];
  private readonly DEFAULT_SENDING_TIMEOUT_SECONDS = 120;
  private readonly DEFAULT_SEND_ATTEMPT_TIMEOUT_MS = 20_000;

  constructor(private readonly prisma: PrismaService) {}

  /** Signal immediate processing — called after queue insert */
  trigger(): void {
    void this.processQueue();
  }

  // Job control
  private isJobEnabled = true;
  private lastRunCount = 0;

  async getStatus() {
    const latest = await this.prisma.emailQueue.findFirst({
      where: { status: 'sent', isDeleted: false, sentAt: { not: null } },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });
    return {
      enabled: this.isJobEnabled,
      lastRunAt: latest?.sentAt ?? null,
      lastRunCount: this.lastRunCount,
    };
  }

  setEnabled(enabled: boolean): void {
    this.isJobEnabled = enabled;
  }

  async retryEmail(id: string): Promise<void> {
    await this.prisma.emailQueue.update({
      where: { id },
      data: { status: 'pending', retryCount: 0, lastError: null, logUpdatedBy: 'system' },
    });
    void this.processQueue();
  }

  async resendEmail(id: string, to: string, updatedBy: string): Promise<void> {
    await this.prisma.emailQueue.update({
      where: { id },
      data: {
        to,
        status: 'pending',
        retryCount: 0,
        lastError: null,
        note: null,
        logUpdatedBy: updatedBy,
      },
    });
    void this.processQueue();
  }

  async getQueueList(
    page: number,
    limit: number,
    status?: string,
    type?: string,
    subject?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Record<string, unknown> = {
      isDeleted: false,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(subject ? { subject: { contains: subject, mode: 'insensitive' as const } } : {}),
    };
    if (startDate || endDate) {
      where['logCreatedAt'] = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    const [items, total] = await Promise.all([
      this.prisma.emailQueue.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, to: true, subject: true, type: true, status: true,
          retryCount: true, lastError: true, sentAt: true, scheduledAt: true,
          note: true,
          logCreatedAt: true,
        },
      }),
      this.prisma.emailQueue.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getQueueStats() {
    const counts = await this.prisma.emailQueue.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: { id: true },
    });
    const result: Record<string, number> = { pending: 0, sending: 0, sent: 0, failed: 0, ignored: 0 };
    for (const row of counts) result[row.status] = row._count.id;
    return result;
  }

  /** Fallback cron poll every 30 seconds */
  @Cron('*/30 * * * * *')
  async processQueue(): Promise<void> {
    if (!this.isJobEnabled) return;

    const maxRetry = await this.getMaxRetry();
    await this.recoverStaleSending(maxRetry);

    const emails = await this.prisma.emailQueue.findMany({
      where: { status: 'pending', isDeleted: false, retryCount: { lt: maxRetry } },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    if (emails.length === 0) return;

    for (const email of emails) {
      await this.sendOne(email, maxRetry);
    }

    this.lastRunCount = emails.length;
  }

  private async recoverStaleSending(maxRetry: number): Promise<void> {
    const timeoutSeconds = await this.getSendingTimeoutSeconds();
    const staleBefore = new Date(Date.now() - timeoutSeconds * 1000);

    const stuckEmails = await this.prisma.emailQueue.findMany({
      where: {
        status: 'sending',
        isDeleted: false,
        logUpdatedAt: { lt: staleBefore },
      },
      select: {
        id: true,
        retryCount: true,
      },
      take: 50,
    });

    if (stuckEmails.length === 0) return;

    for (const email of stuckEmails) {
      const nextRetry = email.retryCount + 1;
      const isPermanentFail = nextRetry >= maxRetry;
      await this.prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: isPermanentFail ? 'failed' : 'pending',
          retryCount: nextRetry,
          lastError: `Recovered from stale sending state after ${timeoutSeconds}s timeout.`,
          logUpdatedBy: 'system',
        },
      });
    }

    this.logger.warn(
      `Recovered ${stuckEmails.length} stale sending emails (timeout ${timeoutSeconds}s).`,
    );
  }

  private async sendOne(
    email: { id: string; to: string; subject: string; bodyHtml: string; type: string; retryCount: number },
    maxRetry: number,
  ): Promise<void> {
    // Optimistic status lock — prevents double-send on concurrent runs
    const locked = await this.prisma.emailQueue.updateMany({
      where: { id: email.id, status: 'pending' },
      data: { status: 'sending', logUpdatedBy: 'system' },
    });
    if (locked.count === 0) return;

    const ignoredMarkers = await this.getIgnoredRecipientMarkers();
    const matchedMarker = this.findIgnoredMarker(email.to, ignoredMarkers);

    if (matchedMarker) {
      const ignoreNote = `Skipped real send: recipient matched ignored keyword "${matchedMarker}".`;
      await this.prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'ignored',
          note: ignoreNote,
          sentAt: new Date(),
          lastError: null,
          logUpdatedBy: 'system',
        },
      });
      this.logger.warn(`Email ignored for ${email.to} [${email.type}] due to keyword "${matchedMarker}"`);
      return;
    }

    try {
      const config = await this.getProviderConfig();

      await this.dispatchEmail(config, {
        to: email.to,
        subject: email.subject,
        html: email.bodyHtml,
      });

      await this.prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'sent', sentAt: new Date(), logUpdatedBy: 'system' },
      });

      this.logger.log(`Email sent to ${email.to} [${email.type}] via ${config.provider}`);
    } catch (error) {
      const newRetryCount = email.retryCount + 1;
      const isPermanentFail = newRetryCount >= maxRetry;

      await this.prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: isPermanentFail ? 'failed' : 'pending',
          retryCount: newRetryCount,
          lastError: (error as Error).message,
          logUpdatedBy: 'system',
        },
      });

      this.logger.error(
        `Email failed for ${email.to} (attempt ${newRetryCount}/${maxRetry}): ${(error as Error).message}`,
      );
    }
  }

  private async dispatchEmail(
    config: EmailProviderConfig,
    mail: { to: string; subject: string; html: string },
  ): Promise<void> {
    const from = `"${config.fromName}" <${config.fromEmail || config.smtpUser}>`;
    const sendAttemptTimeoutMs = await this.getSendAttemptTimeoutMs();

    if (config.provider === 'smtp') {
      if (!config.smtpUser || !config.smtpPass) {
        throw new Error('SMTP credentials (email.smtp_user / email.smtp_pass) not configured');
      }
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: false,
        auth: { user: config.smtpUser, pass: config.smtpPass },
        connectionTimeout: sendAttemptTimeoutMs,
        greetingTimeout: sendAttemptTimeoutMs,
        socketTimeout: sendAttemptTimeoutMs,
      });
      await this.withTimeout(
        transporter.sendMail({ from, to: mail.to, subject: mail.subject, html: mail.html }),
        sendAttemptTimeoutMs,
        `SMTP send timeout after ${sendAttemptTimeoutMs}ms`,
      );
      return;
    }

    // API-based providers (sendgrid, mailgun, resend, ...)
    if (!config.providerApiKey) {
      throw new Error(`email.provider_api_key not configured for provider "${config.provider}"`);
    }
    if (!config.fromEmail) {
      throw new Error('email.from_email not configured (required for API-based providers)');
    }

    if (config.provider === 'sendgrid') {
      sgMail.setApiKey(config.providerApiKey);
      await this.withTimeout(
        sgMail.send({
          from: { name: config.fromName, email: config.fromEmail },
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
        }),
        sendAttemptTimeoutMs,
        `SendGrid send timeout after ${sendAttemptTimeoutMs}ms`,
      );
      return;
    }

    throw new Error(`Unsupported email provider: "${config.provider}". Supported: smtp, sendgrid`);
  }

  /** Invalidate the provider config cache (call after settings change) */
  invalidateCache(): void {
    this.providerConfigCache = null;
    this.providerCachedAt = 0;
  }

  /** Send a test email using a specific EmailProviderConfig row (bypasses active/cache) */
  async sendTestEmail(configId: string, to: string): Promise<void> {
    const row = await this.prisma.emailProviderConfig.findFirst({
      where: { id: configId, isDeleted: false },
    });
    if (!row) throw new Error(`Email config "${configId}" not found`);

    let rawConfig: Record<string, string> = {};
    try {
      rawConfig = JSON.parse(row.config) as Record<string, string>;
    } catch {
      throw new Error(`Config "${row.name}" has invalid JSON in config field`);
    }

    const parsedPort = parseInt(rawConfig['port'] ?? '587', 10);
    const config: EmailProviderConfig = {
      id:             row.id,
      provider:       row.provider,
      fromName:       row.fromName,
      fromEmail:      row.fromEmail,
      smtpHost:       rawConfig['host']   ?? 'smtp.gmail.com',
      smtpPort:       isNaN(parsedPort) ? 587 : parsedPort,
      smtpUser:       rawConfig['user']   ?? '',
      smtpPass:       rawConfig['pass']   ?? '',
      providerApiKey: rawConfig['apiKey'] ?? '',
    };

    await this.dispatchEmail(config, {
      to,
      subject: `[HVFlow] Test email — ${row.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#111">✅ Test email successful</h2>
          <p style="color:#444">This is a test email from <strong>HVFlow</strong>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <table style="font-size:13px;color:#666;width:100%">
            <tr><td style="padding:4px 0"><b>Config name</b></td><td>${row.name}</td></tr>
            <tr><td style="padding:4px 0"><b>Provider</b></td><td>${row.provider}</td></tr>
            <tr><td style="padding:4px 0"><b>From</b></td><td>${row.fromName} &lt;${row.fromEmail}&gt;</td></tr>
            <tr><td style="padding:4px 0"><b>Sent at</b></td><td>${new Date().toISOString()}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#999">
            If you received this, the configuration is working correctly.
          </p>
        </div>
      `,
    });
    this.logger.log(`Test email sent to ${to} via config "${row.name}" (${row.provider})`);
  }

  private async getProviderConfig(): Promise<EmailProviderConfig> {
    const now = Date.now();
    if (this.providerConfigCache && now - this.providerCachedAt < this.PROVIDER_CACHE_TTL) {
      return this.providerConfigCache;
    }

    const row = await this.prisma.emailProviderConfig.findFirst({
      where: { isActive: true, isDeleted: false, isDisabled: false },
      orderBy: { logUpdatedAt: 'desc' }, // most-recently activated wins if DB has >1 active (data anomaly)
    });

    if (!row) {
      throw new Error('No active email provider configured. Go to System → Email Configs and activate one.');
    }

    let rawConfig: Record<string, string> = {};
    try {
      rawConfig = JSON.parse(row.config) as Record<string, string>;
    } catch {
      throw new Error(`Email provider config "${row.name}" has invalid JSON in config field`);
    }

    const parsedPort = parseInt(rawConfig['port'] ?? '587', 10);

    this.providerConfigCache = {
      id:             row.id,
      provider:       row.provider,
      fromName:       row.fromName,
      fromEmail:      row.fromEmail,
      smtpHost:       rawConfig['host']  ?? 'smtp.gmail.com',
      smtpPort:       isNaN(parsedPort) ? 587 : parsedPort,
      smtpUser:       rawConfig['user']  ?? '',
      smtpPass:       rawConfig['pass']  ?? '',
      providerApiKey: rawConfig['apiKey'] ?? '',
    };
    this.providerCachedAt = now;

    return this.providerConfigCache;
  }

  private async getMaxRetry(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: 'email.max_retry' } });
    return parseInt(row?.value ?? '3', 10);
  }

  private async getSendingTimeoutSeconds(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.sending_timeout_seconds' },
    });

    const parsed = parseInt(row?.value ?? `${this.DEFAULT_SENDING_TIMEOUT_SECONDS}`, 10);
    if (isNaN(parsed) || parsed < 30) return this.DEFAULT_SENDING_TIMEOUT_SECONDS;
    return parsed;
  }

  private async getSendAttemptTimeoutMs(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.send_attempt_timeout_ms' },
    });

    const parsed = parseInt(row?.value ?? `${this.DEFAULT_SEND_ATTEMPT_TIMEOUT_MS}`, 10);
    if (isNaN(parsed) || parsed < 3000) return this.DEFAULT_SEND_ATTEMPT_TIMEOUT_MS;
    return Math.min(parsed, 120000);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private async getIgnoredRecipientMarkers(): Promise<string[]> {
    const now = Date.now();
    if (
      this.ignoredRecipientMarkersCache &&
      now - this.ignoredRecipientMarkersCachedAt < this.IGNORED_MARKERS_CACHE_TTL
    ) {
      return this.ignoredRecipientMarkersCache;
    }

    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.ignore_recipient_keywords' },
    });

    const parsed = (row?.value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    this.ignoredRecipientMarkersCache = parsed.length > 0 ? parsed : this.DEFAULT_IGNORED_EMAIL_MARKERS;
    this.ignoredRecipientMarkersCachedAt = now;
    return this.ignoredRecipientMarkersCache;
  }

  private findIgnoredMarker(to: string, markers: string[]): string | null {
    const normalized = to.toLowerCase();
    return markers.find((marker) => normalized.includes(marker)) ?? null;
  }
}
