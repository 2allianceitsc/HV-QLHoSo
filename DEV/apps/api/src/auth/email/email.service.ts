import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailJobService } from '../../email/email-job.service';
import {
  DEFAULT_OTP_TEMPLATE,
  DEFAULT_WELCOME_TEMPLATE,
  DEFAULT_AUTO_LOGOUT_TEMPLATE,
} from '../../email/email-default-templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailJobService: EmailJobService,
  ) {}

  /** Queue OTP email via EmailQueue — non-blocking */
  async queueOtpEmail(to: string, otp: string): Promise<void> {
    const templateSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.template.otp' },
    });

    const expiryMinutesSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'otp.expiry_minutes' },
    });
    const expiryMinutes = expiryMinutesSetting?.value ?? '5';
    const baseTemplate = templateSetting?.value?.trim() || DEFAULT_OTP_TEMPLATE;
    const html = baseTemplate
      .replace(/{{OTP}}/g, otp)
      .replace(/{{EXPIRY_MINUTES}}/g, expiryMinutes);

    await this.prisma.emailQueue.create({
      data: {
        id: uuidv7(),
        to,
        subject: 'VIBE365 - Your Verification Code',
        bodyHtml: html,
        type: 'otp',
        logCreatedBy: 'system',
      },
    });
    this.emailJobService.trigger();
  }



  /** Queue 2FA login OTP email via EmailQueue — non-blocking */
  async queue2FAOtpEmail(to: string, otp: string): Promise<void> {
    const html = `<!DOCTYPE html><html lang="en"><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:#1a1a2e;padding:24px 32px;"><h1 style="color:#fff;margin:0;font-size:24px;">VIBE365</h1></div>
  <div style="padding:32px;">
    <h2 style="color:#1a1a2e;margin:0 0 16px;">Two-Factor Authentication Code</h2>
    <p style="color:#555;">Use the code below to complete your login. It expires in <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;">${otp}</span>
    </div>
    <p style="color:#888;font-size:12px;">If you did not attempt to log in, please change your password immediately.</p>
  </div>
</div></body></html>`;

    await this.prisma.emailQueue.create({
      data: {
        id: uuidv7(),
        to,
        subject: 'VIBE365 - Your Login Verification Code',
        bodyHtml: html,
        type: 'otp',
        logCreatedBy: 'system',
      },
    });
    this.emailJobService.trigger();
  }

  /** Queue welcome email via EmailQueue — non-blocking */
  async queueWelcomeEmail(to: string, fullName: string): Promise<void> {
    const templateSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.template.welcome' },
    });

    const baseTemplate = templateSetting?.value?.trim() || DEFAULT_WELCOME_TEMPLATE;
    const html = baseTemplate.replace(/{{FULL_NAME}}/g, fullName);

    await this.prisma.emailQueue.create({
      data: {
        id: uuidv7(),
        to,
        subject: 'Welcome to VIBE365 — Your account is ready',
        bodyHtml: html,
        type: 'welcome',
        logCreatedBy: 'system',
      },
    });
    this.emailJobService.trigger();
    this.logger.log(`Welcome email queued for ${to}`);
  }

  async sendAutoLogoutAlert(to: string, firstName: string, logoutTime: string): Promise<void> {
    const html = DEFAULT_AUTO_LOGOUT_TEMPLATE
      .replace(/{{FIRST_NAME}}/g, firstName)
      .replace(/{{LOGOUT_TIME}}/g, logoutTime);

    try {
      const transporter = this.createTransporter();
      await transporter.sendMail({
        from: `"VIBE365" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject: 'VIBE365 - You have been automatically logged out',
        html,
      });
      this.logger.log(`Auto-logout alert sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send auto-logout alert to ${to}`, error);
    }
  }

  private createTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }
}
