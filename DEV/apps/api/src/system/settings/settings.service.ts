import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingDto } from './dto/setting.dto';

const DEFAULT_SETTINGS = [
  {
    key: 'company_name',
    value: 'VIBE365',
    description: 'Company display name',
    category: 'general',
  },
  {
    key: 'default_timezone',
    value: 'Asia/Ho_Chi_Minh',
    description: 'Default timezone for the system',
    category: 'general',
  },
  {
    key: 'max_break_minutes',
    value: '60',
    description: 'Maximum allowed break duration in minutes',
    category: 'attendance',
  },
  {
    key: 'attendance.auto_logout.enabled',
    value: 'true',
    description: 'Enable automatic logout at each employee latest end shift time',
    category: 'attendance',
  },
  {
    key: 'require_mood_on_logout',
    value: 'false',
    description: 'Require employees to submit mood when logging out',
    category: 'attendance',
  },
  {
    key: 'throttle_ip_whitelist',
    value: '127.0.0.1,::1,::ffff:127.0.0.1',
    description: 'Comma-separated IPs exempt from rate limiting (e.g. localhost, internal proxies)',
    category: 'security',
  },
  {
    key: 'throttle_default_limit',
    value: '300',
    description: 'Max requests per minute per IP (global)',
    category: 'security',
  },
  {
    key: 'throttle_default_ttl',
    value: '60000',
    description: 'Rate limit window in milliseconds (global)',
    category: 'security',
  },
  {
    key: 'storage.r2',
    value: JSON.stringify({
      accountId: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucket: 'vibe365',
      publicUrl: '',
    }),
    description: 'Cloudflare R2 storage config (JSON): accountId, accessKeyId, secretAccessKey, bucket, publicUrl',
    category: 'storage',
  },
  // Email global config (category: email) — provider configs are in EmailProviderConfig table
  { key: 'email.max_retry',  value: '3',    description: 'Max send retry attempts per email', category: 'email' },
  { key: 'email.job.enabled', value: 'true', description: 'Enable email job cron processing',  category: 'email' },
  { key: 'email.ignore_recipient_keywords', value: 'test,dev', description: 'Comma-separated keywords to skip real email sending (recipient contains keyword)', category: 'email' },
  { key: 'notification.auto_logout_in_app.enabled', value: 'true', description: 'Send in-app notification when auto-logout runs', category: 'notifications' },
  { key: 'notification.auto_logout_email.enabled', value: 'false', description: 'Send email alert when auto-logout runs', category: 'notifications' },
  { key: 'notification.google_chat_webhook', value: 'https://chat.googleapis.com/v1/spaces/AAQArIGaAGs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=sp1NcWOwS3Ym5gxyyAYuVO_Nw1wFUZfVpG6gD85dynI', description: 'Google Chat incoming webhook URL for system alerts', category: 'notifications' },
  // OTP security config (category: security)
  { key: 'otp.expiry_minutes',  value: '5',  description: 'OTP expiry in minutes',               category: 'security' },
  { key: 'otp.max_daily',       value: '3',  description: 'Max OTP requests per email per day',  category: 'security' },
  { key: 'otp.resend_cooldown', value: '60', description: 'Seconds between OTP requests',        category: 'security' },
  { key: 'email.job.enabled',   value: 'true', description: 'Enable email job cron processing',  category: 'email' },
  {
    key: 'login.show_test_accounts',
    value: 'false',
    description: 'Show test account shortcuts on the login page (dev/staging only)',
    category: 'general',
  },
  {
    key: 'logout_config',
    value: JSON.stringify({ MoodLogRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] }),
    description: 'Logout behaviour config (JSON): MoodLogRoles — roles that must submit mood on logout',
    category: 'attendance',
  },
  {
    key: 'system.debug_mode',
    value: 'false',
    description: 'Global debug flag — when true, services emit detailed trace logs (DebugService)',
    category: 'system',
  },
  {
    key: 'display.show_header_clock',
    value: 'true',
    description: 'Show current time clock in the header bar (client time)',
    category: 'display',
  },
];

const DEFAULT_SETTING_META = new Map(
  DEFAULT_SETTINGS.map((s) => [s.key, { category: s.category, description: s.description }]),
);

function ensureSetting(
  grouped: Record<string, Array<{ key: string; value: string; category?: string | null; description?: string | null; logUpdatedAt: Date; logUpdatedBy?: string | null }>>,
  settings: Array<{ key: string }>,
  fallback: { key: string; value: string; category: string; description: string },
) {
  if (!grouped[fallback.category]) grouped[fallback.category] = [];
  if (settings.some((s) => s.key === fallback.key)) return;
  grouped[fallback.category].push({
    ...fallback,
    logUpdatedAt: new Date(),
    logUpdatedBy: 'system',
  });
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, typeof settings> = {};
    for (const s of settings) {
      const fallback = DEFAULT_SETTING_META.get(s.key);
      const cat = s.category ?? fallback?.category ?? 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        ...s,
        category: cat,
        description: s.description ?? fallback?.description ?? s.key,
      });
    }
    
    if (!grouped['branding']) grouped['branding'] = [];
    if (!settings.some(s => s.key === 'APP_LOGO_BASE64')) {
      grouped['branding'].push({
        key: 'APP_LOGO_BASE64', value: '', category: 'branding', description: 'Application Logo (Base64)', logUpdatedAt: new Date(), logUpdatedBy: 'system'
      });
    }
    if (!settings.some(s => s.key === 'APP_FAVICON_BASE64')) {
      grouped['branding'].push({
        key: 'APP_FAVICON_BASE64', value: '', category: 'branding', description: 'Application Favicon (Base64)', logUpdatedAt: new Date(), logUpdatedBy: 'system'
      });
    }
    if (!settings.some(s => s.key === 'LOGIN_COMPANY_ID')) {
      grouped['branding'].push({
        key: 'LOGIN_COMPANY_ID', value: '', category: 'branding', description: 'Login Screen — Company Logo (select company)', logUpdatedAt: new Date(), logUpdatedBy: 'system'
      });
    }

    ensureSetting(grouped, settings, {
      key: 'storage.r2',
      value: JSON.stringify({ accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '' }),
      category: 'storage',
      description: 'Cloudflare R2 storage config',
    });
    ensureSetting(grouped, settings, {
      key: 'throttle_ip_whitelist',
      value: '127.0.0.1,::1,::ffff:127.0.0.1',
      category: 'security',
      description: 'Comma-separated IPs exempt from rate limiting (e.g. localhost, internal proxies)',
    });
    ensureSetting(grouped, settings, {
      key: 'throttle_default_limit',
      value: '60',
      category: 'security',
      description: 'Max requests per minute per IP (global)',
    });
    ensureSetting(grouped, settings, {
      key: 'attendance.auto_logout.enabled',
      value: 'true',
      category: 'attendance',
      description: 'Enable automatic logout at each employee latest end shift time',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.auto_logout_in_app.enabled',
      value: 'true',
      category: 'notifications',
      description: 'Send in-app notification when auto-logout runs',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.auto_logout_email.enabled',
      value: 'false',
      category: 'notifications',
      description: 'Send email alert when auto-logout runs',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.late_arrival_in_app.enabled',
      value: 'true',
      category: 'notifications',
      description: 'Send in-app notification to manager when staff checks in after LatestStartTime (N-A03)',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.over_break_manager_in_app.enabled',
      value: 'true',
      category: 'notifications',
      description: 'Send in-app notification to manager when staff over-break record is closed (N-A04)',
    });
    ensureSetting(grouped, settings, {
      key: 'logout_config',
      value: JSON.stringify({ MoodLogRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] }),
      category: 'attendance',
      description: 'Logout behaviour config (JSON): MoodLogRoles — roles that must submit mood on logout',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.absent_staff_in_app.enabled',
      value: 'true',
      category: 'notifications',
      description: 'Send in-app notification to manager when staff has no check-in after LatestStartTime (N-A06)',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.pre_logout_in_app.enabled',
      value: 'true',
      category: 'notifications',
      description: 'Warn employee in-app before auto-logout fires (N-A05)',
    });
    ensureSetting(grouped, settings, {
      key: 'notification.pre_logout_warning_minutes',
      value: '15',
      category: 'notifications',
      description: 'How many minutes before auto-logout to send the pre-logout warning (N-A05)',
    });
    ensureSetting(grouped, settings, {
      key: 'email.ignore_recipient_keywords',
      value: 'test,dev',
      category: 'email',
      description: 'Comma-separated keywords to skip real email sending (recipient contains keyword)',
    });
    ensureSetting(grouped, settings, {
      key: 'display.show_header_clock',
      value: 'true',
      category: 'display',
      description: 'Show current time clock in the header bar (client time)',
    });

    return grouped;
  }

  async findOne(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  async updateOne(key: string, dto: UpdateSettingDto, updatedBy: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: dto.value, description: dto.description, logUpdatedBy: updatedBy },
      create: {
        key,
        value: dto.value,
        description: dto.description,
        category: dto.category,
        logUpdatedBy: updatedBy,
      },
    });
  }

  async bulkUpdate(settings: Record<string, string>, updatedBy: string) {
    const BRANDING_KEYS = ['APP_LOGO_BASE64', 'APP_FAVICON_BASE64', 'ESC_LOGO_BASE64'];
    const hasBrandingChange = BRANDING_KEYS.some((k) => k in settings);

    const ops = Object.entries(settings).map(([key, value]) => {
      const meta = DEFAULT_SETTING_META.get(key);
      return this.prisma.systemSetting.upsert({
        where: { key },
        update: { value, logUpdatedBy: updatedBy },
        create: { key, value, category: meta?.category, description: meta?.description, logUpdatedBy: updatedBy },
      });
    });

    if (hasBrandingChange) {
      const version = Date.now().toString();
      ops.push(
        this.prisma.systemSetting.upsert({
          where: { key: 'BRANDING_VERSION' },
          update: { value: version, logUpdatedBy: updatedBy },
          create: { key: 'BRANDING_VERSION', value: version, category: 'branding', logUpdatedBy: updatedBy },
        }),
      );
    }

    await this.prisma.$transaction(ops);
    return { updated: Object.keys(settings).length };
  }

  async seed() {
    for (const s of DEFAULT_SETTINGS) {
      await this.prisma.systemSetting.upsert({
        where: { key: s.key },
        update: {},
        create: s,
      });
    }
    return { seeded: DEFAULT_SETTINGS.length };
  }
}
