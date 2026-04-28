import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotImplementedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TwoFAMethod } from '@shared/enums/two-fa-method.enum';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes, randomInt } from 'crypto';
import { uuidv7 } from 'uuidv7';
import { IJwtPayload } from '../strategies/jwt.strategy';

// ── Native TOTP helpers (no external deps — pure Node.js crypto) ──────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32: string): Buffer {
  const str = base32.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of str) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(output);
}

function totpGenerateSecret(): string {
  const raw = randomBytes(20);
  let result = '';
  let bits = 0, value = 0;
  for (const byte of raw) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

function totpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[19] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1_000_000;
  return code.toString().padStart(6, '0');
}

function totpVerify(secret: string, token: string, window = 1): boolean {
  const now = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, now + i) === token) return true;
  }
  return false;
}

function totpBuildUri(secret: string, label: string, issuer: string): string {
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Derive per-user TOTP secret: HMAC-SHA1(systemKey, staffId) → Base32 */
function deriveUserTotpSecret(systemKey: string, staffId: string): string {
  const raw = createHmac('sha1', Buffer.from(systemKey, 'utf8')).update(staffId).digest();
  let result = '';
  let bits = 0, value = 0;
  for (const byte of raw) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

interface I2FAConfig {
  using2FA: boolean;
  forceToEnable: boolean;
  ggSecretKey: string;
  ggAppId: string;
  digits: number;
  pinExpiryMinutes: number;
  authenticators: 'Google' | 'Email';
  whitelist: Array<{ AppName: string; Usernames: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────

interface I2FAChallenge {
  sub: string;   // userId
  type: '2fa-challenge';
  method: TwoFAMethod;
}

@Injectable()
export class TwoFAService {
  private readonly logger = new Logger(TwoFAService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ── Status ───────────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: userId },
      select: { auth2FAEnabled: true, auth2FAMethod: true },
    });
    return {
      enabled: userLogin?.auth2FAEnabled ?? false,
      method: userLogin?.auth2FAMethod ?? null,
    };
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  async initiateSetup(userId: string, method: TwoFAMethod) {
    if (method === TwoFAMethod.SMS) {
      throw new NotImplementedException('SMS 2FA is not yet supported. Please use Authenticator App or Email OTP.');
    }

    if (method === TwoFAMethod.EMAIL_OTP) {
      // Email OTP requires no pre-setup — just confirm intent
      return { method, message: 'Email OTP will be sent to your registered email on each login.' };
    }

    // TOTP: generate secret + QR code
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });
    if (!userLogin) throw new UnauthorizedException();

    const secret = totpGenerateSecret();
    const otpUri = totpBuildUri(secret, userLogin.email, 'VIBE365');
    const qrDataUri = await qrcode.toDataURL(otpUri);

    // Store secret temporarily in session (we'll persist only after confirmation)
    // Use a short-lived JWT to carry the secret securely to the confirm step
    const setupToken = this.jwtService.sign(
      { sub: userId, type: '2fa-setup', secret, method },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    return { method, setupToken, qrDataUri, secret };
  }

  async confirmSetup(userId: string, method: TwoFAMethod, code: string, setupToken?: string) {
    if (method === TwoFAMethod.SMS) {
      throw new NotImplementedException('SMS 2FA is not yet supported.');
    }

    if (method === TwoFAMethod.EMAIL_OTP) {
      // Email OTP: no secret needed — just enable
      await this.prisma.userLogin.update({
        where: { id: userId },
        data: { auth2FAEnabled: true, auth2FAMethod: TwoFAMethod.EMAIL_OTP },
      });
      return { success: true };
    }

    // TOTP: verify the code against the pending secret from setupToken
    if (!setupToken) throw new BadRequestException('Setup token required for TOTP confirmation.');

    let payload: { sub: string; type: string; secret: string; method: string };
    try {
      payload = this.jwtService.verify(setupToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof payload;
    } catch {
      throw new BadRequestException('Setup token expired or invalid. Please start setup again.');
    }

    if (payload.sub !== userId || payload.type !== '2fa-setup') {
      throw new BadRequestException('Invalid setup token.');
    }

    if (!totpVerify(payload.secret, code)) throw new BadRequestException('Invalid authenticator code. Please try again.');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Persist secret + enable 2FA
    await this.prisma.$transaction([
      this.prisma.auth2FASecret.upsert({
        where: { userId },
        create: {
          id: uuidv7(),
          userId,
          secret: payload.secret,
          backupCodes: JSON.stringify(backupCodes),
        },
        update: {
          secret: payload.secret,
          backupCodes: JSON.stringify(backupCodes),
        },
      }),
      this.prisma.userLogin.update({
        where: { id: userId },
        data: { auth2FAEnabled: true, auth2FAMethod: TwoFAMethod.TOTP },
      }),
    ]);

    return { success: true, backupCodes };
  }

  async disable(userId: string, password: string) {
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: userId },
      select: { passwordHash: true, auth2FAEnabled: true },
    });
    if (!userLogin) throw new UnauthorizedException();
    if (!userLogin.auth2FAEnabled) throw new BadRequestException('2FA is not enabled.');

    const isPasswordValid = await bcrypt.compare(password, userLogin.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Incorrect password.');

    await this.prisma.$transaction([
      this.prisma.auth2FASecret.deleteMany({ where: { userId } }),
      this.prisma.userLogin.update({
        where: { id: userId },
        data: { auth2FAEnabled: false, auth2FAMethod: null },
      }),
    ]);

    return { success: true };
  }

  // ── Legacy generateChallenge (kept for backward compat with old enrolled users) ──

  async generateChallenge(userId: string, method: TwoFAMethod, email: string): Promise<string> {
    return this.generateChallengeForStaff(userId, null, method === TwoFAMethod.EMAIL_OTP ? 'Email' : 'Google', email);
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async verifyTotp(userId: string, code: string) {
    const secret = await this.prisma.auth2FASecret.findUnique({ where: { userId } });
    if (!secret) throw new UnauthorizedException('2FA not configured.');

    // Check if it's a backup code
    const backupCodes: string[] = JSON.parse(secret.backupCodes) as string[];
    const backupIndex = backupCodes.indexOf(code);
    if (backupIndex !== -1) {
      // Consume backup code (one-time use)
      backupCodes.splice(backupIndex, 1);
      await this.prisma.auth2FASecret.update({
        where: { userId },
        data: { backupCodes: JSON.stringify(backupCodes) },
      });
      return;
    }

    if (!totpVerify(secret.secret, code)) throw new UnauthorizedException('Invalid authenticator code.');
  }

  private async verifyEmailOtp(userId: string, code: string) {
    const loginOtp = await this.prisma.loginOtp.findFirst({
      where: {
        userId,
        otp: code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!loginOtp) throw new UnauthorizedException('Invalid or expired OTP.');

    await this.prisma.loginOtp.update({
      where: { id: loginOtp.id },
      data: { isUsed: true },
    });
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () =>
      randomInt(10000000, 99999999).toString(),
    );
  }

  // ── 2FA Evaluation (BA §4.1 Decision Tree) ───────────────────────────────

  /**
   * Evaluates the 5-step 2FA decision tree after successful password verification.
   * Returns null if 2FA should be skipped (proceed to normal login).
   * Returns an object if 2FA is required (challenge or setup).
   */
  async evaluate2FA(
    userId: string,
    username: string,
    staffId: string | null,
    email: string,
  ): Promise<{
    requires2FA?: boolean;
    challengeToken?: string;
    twoFAMethod?: string;
    availableMethods?: string[];
    requires2FASetup?: boolean;
    setupToken?: string;
  } | null> {
    const config = await this.getTwoFAConfig();

    // Step 1: System 2FA disabled
    if (!config.using2FA) return null;

    // Step 2: WhiteList bypass
    if (this.isUserInWhiteList(username, config.whitelist)) return null;

    // Step 3: Neither forced nor individually required
    const needsIt = config.forceToEnable || (staffId ? await this.staffNeeds2FA(staffId) : false);
    if (!needsIt) return null;

    // Step 4: Staff hasn't set up 2FA yet → force to S43
    if (staffId) {
      const staff = await this.prisma.staff.findUnique({ where: { id: staffId }, select: { is2FAEnabled: true } });
      if (!staff?.is2FAEnabled) {
        const setupToken = this.jwtService.sign(
          { sub: userId, staffId, type: '2fa-setup-required' },
          { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '10m' },
        );
        return { requires2FASetup: true, setupToken };
      }
    }

    // Step 5: Check "already logged in today" (once-per-day skip)
    if (staffId) {
      const alreadyLoggedIn = await this.hasLoggedInToday(staffId);
      if (alreadyLoggedIn) return null;
    }

    // Issue challenge
    const authenticators = await this.getEnabledAuthenticators(staffId, config.authenticators);
    const primaryMethod = authenticators[0] ?? config.authenticators;
    const challengeToken = await this.generateChallengeForStaff(userId, staffId, primaryMethod, email);
    return {
      requires2FA: true,
      challengeToken,
      twoFAMethod: primaryMethod,
      availableMethods: authenticators,
    };
  }

  // ── System Config ──────────────────────────────────────────────────────────

  async getTwoFAConfig(): Promise<I2FAConfig> {
    const keys = [
      'twofa.using_2fa', 'twofa.force_to_enable', 'twofa.gg_secret_key',
      'twofa.gg_app_id', 'twofa.digits', 'twofa.pin_expiry_minutes',
      'twofa.authenticators', 'twofa.whitelist',
    ];
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      using2FA: m['twofa.using_2fa'] === 'true',
      forceToEnable: m['twofa.force_to_enable'] === 'true',
      ggSecretKey: m['twofa.gg_secret_key'] ?? '',
      ggAppId: m['twofa.gg_app_id'] ?? 'VIBE365',
      digits: parseInt(m['twofa.digits'] ?? '6', 10),
      pinExpiryMinutes: parseInt(m['twofa.pin_expiry_minutes'] ?? '5', 10),
      authenticators: (m['twofa.authenticators'] ?? 'Google') as 'Google' | 'Email',
      whitelist: this.parseWhitelistConfig(m['twofa.whitelist'] ?? '[]'),
    };
  }

  isUserInWhiteList(username: string, whitelist: Array<{ AppName: string; Usernames: string }>): boolean {
    const normalizedUsername = username.toLowerCase().trim();
    for (const entry of whitelist) {
      const usernames = entry.Usernames
        .split(/[;,\n]/)
        .map((u) => u.trim().toLowerCase())
        .filter((u) => u.length > 0);
      if (usernames.includes(normalizedUsername)) return true;
    }
    return false;
  }

  private parseWhitelistConfig(rawValue: string): Array<{ AppName: string; Usernames: string }> {
    const trimmed = rawValue.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (entry): entry is { AppName?: unknown; Usernames?: unknown } =>
              typeof entry === 'object' && entry !== null,
          )
          .map((entry) => ({
            AppName: String(entry.AppName ?? 'VIBE365'),
            Usernames: String(entry.Usernames ?? ''),
          }))
          .filter((entry) => entry.Usernames.trim().length > 0);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const asObj = parsed as { AppName?: unknown; Usernames?: unknown };
        return [{
          AppName: String(asObj.AppName ?? 'VIBE365'),
          Usernames: String(asObj.Usernames ?? ''),
        }].filter((entry) => entry.Usernames.trim().length > 0);
      }
    } catch (err) {
      this.logger.error(
        `[2FA] twofa.whitelist config is not valid JSON — falling back to plain-text mode. Fix the value in Settings → twofa.whitelist. Raw value: "${trimmed}". Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return [{ AppName: 'VIBE365', Usernames: trimmed }];
  }

  private async staffNeeds2FA(staffId: string): Promise<boolean> {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId }, select: { is2FANeedEnable: true } });
    return staff?.is2FANeedEnable ?? false;
  }

  private async hasLoggedInToday(staffId: string): Promise<boolean> {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId }, select: { timezone: true } });
    const tz = staff?.timezone ?? 'UTC';
    // Use DB-level timezone conversion
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "TimeTracking" t
      JOIN "StatusDefinition" s ON t."StatusId" = s."id"
      WHERE t."StaffId" = ${staffId}
        AND s."IsLoginStatus" = true
        AND t."IsDeleted" = false
        AND (t."StartTime" AT TIME ZONE ${tz})::date = (NOW() AT TIME ZONE ${tz})::date
    `;
    return Number(result[0]?.count ?? 0) > 0;
  }

  private async getEnabledAuthenticators(staffId: string | null, defaultMethod: 'Google' | 'Email'): Promise<string[]> {
    if (!staffId) return [defaultMethod];
    const records = await this.prisma.staffAuthenticator.findMany({
      where: { staffId, isEnable: true, isDeleted: false },
      orderBy: { orderNo: 'asc' },
    });
    return records.length > 0 ? records.map((r) => r.code) : [defaultMethod];
  }

  private async generateChallengeForStaff(
    userId: string,
    staffId: string | null,
    method: string,
    email: string,
  ): Promise<string> {
    if (method === 'Email') {
      const config = await this.getTwoFAConfig();
      const otp = randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + config.pinExpiryMinutes * 60 * 1000);

      // Get recipient from StaffAuthenticator, fallback to email
      let recipient = email;
      if (staffId) {
        const auth = await this.prisma.staffAuthenticator.findFirst({
          where: { staffId, code: 'Email', isDeleted: false },
          select: { recipient: true },
        });
        if (auth?.recipient) recipient = auth.recipient;
      }

      await this.prisma.loginOtp.updateMany({ where: { userId, isUsed: false }, data: { isUsed: true } });
      await this.prisma.loginOtp.create({ data: { id: uuidv7(), userId, otp, expiresAt } });
      await this.emailService.queue2FAOtpEmail(recipient, otp);
    }

    return this.jwtService.sign(
      { sub: userId, staffId, type: '2fa-challenge', method },
      { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '10m' },
    );
  }

  // ── Initial Setup (S43) ───────────────────────────────────────────────────

  async initiateInitialSetup(setupToken: string) {
    const payload = this.verifySetupToken(setupToken);
    const config = await this.getTwoFAConfig();
    const method = config.authenticators;

    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: payload.sub },
      select: { email: true, username: true },
    });
    if (!userLogin) throw new UnauthorizedException();

    if (method === 'Google') {
      const secret = deriveUserTotpSecret(config.ggSecretKey, payload.staffId ?? payload.sub);
      const otpUri = totpBuildUri(secret, `${config.ggAppId}:${userLogin.username}`, config.ggAppId);
      const qrDataUri = await qrcode.toDataURL(otpUri);
      return { method, qrDataUri, secret };
    } else {
      // Email: send OTP
      const otp = randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + config.pinExpiryMinutes * 60 * 1000);
      await this.prisma.loginOtp.updateMany({ where: { userId: payload.sub, isUsed: false }, data: { isUsed: true } });
      await this.prisma.loginOtp.create({ data: { id: uuidv7(), userId: payload.sub, otp, expiresAt } });
      await this.emailService.queue2FAOtpEmail(userLogin.email, otp);
      return { method, message: `OTP sent to ${userLogin.email}` };
    }
  }

  async confirmInitialSetup(setupToken: string, code: string) {
    const payload = this.verifySetupToken(setupToken);
    const config = await this.getTwoFAConfig();
    const method = config.authenticators;
    const staffId = payload.staffId ?? payload.sub;

    if (method === 'Google') {
      const secret = deriveUserTotpSecret(config.ggSecretKey, staffId);
      if (!totpVerify(secret, code)) throw new BadRequestException('Invalid authenticator code. Please try again.');
    } else {
      await this.verifyEmailOtp(payload.sub, code);
    }

    // Create StaffAuthenticator records (2 records: Google + Email)
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: payload.sub },
      select: { email: true },
    });
    const email = userLogin?.email ?? '';

    await this.prisma.$transaction([
      // Google record
      this.prisma.staffAuthenticator.upsert({
        where: { staffId_code: { staffId, code: 'Google' } },
        create: {
          id: uuidv7(), staffId, code: 'Google', name: 'Google OTP',
          isEnable: method === 'Google', recipient: email, logCreatedBy: payload.sub,
        },
        update: { isEnable: method === 'Google', recipient: email, logUpdatedBy: payload.sub, isDeleted: false, isDisabled: false },
      }),
      // Email record
      this.prisma.staffAuthenticator.upsert({
        where: { staffId_code: { staffId, code: 'Email' } },
        create: {
          id: uuidv7(), staffId, code: 'Email', name: 'Email OTP',
          isEnable: method === 'Email', recipient: email, logCreatedBy: payload.sub,
        },
        update: { isEnable: method === 'Email', recipient: email, logUpdatedBy: payload.sub, isDeleted: false, isDisabled: false },
      }),
      // Mark staff as 2FA enabled
      this.prisma.staff.update({ where: { id: staffId }, data: { is2FAEnabled: true } }),
    ]);

    // Return full userLogin so controller can complete the login session immediately (BA §6.10.1)
    return this.prisma.userLogin.findUnique({
      where: { id: payload.sub },
      include: {
        staff: {
          include: { staffRoles: { where: { isDeleted: false }, include: { role: true } } },
        },
      },
    });
  }

  // ── Profile: Authenticator Management (S33) ──────────────────────────────

  async getAuthenticators(staffId: string) {
    return this.prisma.staffAuthenticator.findMany({
      where: { staffId, isDeleted: false },
      orderBy: { orderNo: 'asc' },
      select: { id: true, code: true, name: true, isEnable: true, recipient: true },
    });
  }

  async updateAuthenticator(id: string, staffId: string, data: { isEnable?: boolean; recipient?: string }) {
    const record = await this.prisma.staffAuthenticator.findFirst({
      where: { id, staffId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Authenticator not found.');

    // Guard: disabling the last enabled method
    if (data.isEnable === false && record.isEnable === true) {
      const remainingEnabled = await this.prisma.staffAuthenticator.count({
        where: { staffId, isEnable: true, isDeleted: false, NOT: { id } },
      });
      if (remainingEnabled === 0) {
        const [staff, forceSetting] = await Promise.all([
          this.prisma.staff.findUnique({ where: { id: staffId }, select: { is2FANeedEnable: true } }),
          this.prisma.systemSetting.findUnique({ where: { key: 'twofa.force_to_enable' } }),
        ]);
        if (staff?.is2FANeedEnable || forceSetting?.value === 'true') {
          throw new BadRequestException('Cannot disable the last 2FA method while 2FA is required for your account.');
        }
        // Not required — allow opt-out; clear is2FAEnabled so login flow is consistent
        const [updated] = await this.prisma.$transaction([
          this.prisma.staffAuthenticator.update({ where: { id }, data: { ...data, logUpdatedBy: staffId } }),
          this.prisma.staff.update({ where: { id: staffId }, data: { is2FAEnabled: false, logUpdatedBy: staffId } }),
        ]);
        return updated;
      }
    }

    return this.prisma.staffAuthenticator.update({ where: { id }, data: { ...data, logUpdatedBy: staffId } });
  }

  async getRequirementStatus(staffId: string) {
    const [staff, forceSetting] = await Promise.all([
      this.prisma.staff.findUnique({
        where: { id: staffId },
        select: { is2FAEnabled: true, is2FANeedEnable: true },
      }),
      this.prisma.systemSetting.findUnique({ where: { key: 'twofa.force_to_enable' } }),
    ]);
    return {
      isEnabled: staff?.is2FAEnabled ?? false,
      isRequired: staff?.is2FANeedEnable ?? false,
      systemForced: forceSetting?.value === 'true',
    };
  }

  async getQrCode(staffId: string, userId: string) {
    const config = await this.getTwoFAConfig();
    const secret = deriveUserTotpSecret(config.ggSecretKey, staffId);
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const label = `${config.ggAppId}:${userLogin?.username ?? userId}`;
    const otpUri = totpBuildUri(secret, label, config.ggAppId);
    const qrDataUri = await qrcode.toDataURL(otpUri);
    return { qrDataUri, secret };
  }

  // ── Admin Reset 2FA ───────────────────────────────────────────────────────

  async adminReset2FA(staffId: string, actorId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, isDeleted: false } });
    if (!staff) throw new NotFoundException('Staff not found.');

    await this.prisma.$transaction([
      this.prisma.staffAuthenticator.updateMany({
        where: { staffId, isDeleted: false },
        data: { isDeleted: true, logUpdatedBy: actorId },
      }),
      this.prisma.staff.update({
        where: { id: staffId },
        data: { is2FAEnabled: false, logUpdatedBy: actorId },
      }),
    ]);

    return { success: true };
  }

  // ── Verify (updated to use HMAC-derived TOTP) ─────────────────────────────

  async verify(challengeToken: string, code: string) {
    let challenge: { sub: string; staffId?: string | null; type: string; method: string };
    try {
      challenge = this.jwtService.verify(challengeToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof challenge;
    } catch {
      throw new UnauthorizedException('2FA session expired. Please log in again.');
    }

    if (challenge.type !== '2fa-challenge') throw new UnauthorizedException('Invalid 2FA token.');

    const { sub: userId, staffId, method } = challenge;

    if (method === 'Google') {
      await this.verifyHmacTotp(staffId ?? userId, code);
    } else if (method === 'Email' || method === TwoFAMethod.EMAIL_OTP) {
      await this.verifyEmailOtp(userId, code);
    } else if (method === TwoFAMethod.TOTP) {
      // Legacy: still support old stored-secret TOTP for existing enrolled users
      await this.verifyTotp(userId, code);
    } else {
      throw new UnauthorizedException('Unsupported 2FA method.');
    }

    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: userId },
      include: {
        staff: {
          include: { staffRoles: { where: { isDeleted: false }, include: { role: true } } },
        },
      },
    });
    if (!userLogin) throw new UnauthorizedException();

    return userLogin;
  }

  private async verifyHmacTotp(staffId: string, code: string) {
    const config = await this.getTwoFAConfig();
    const secret = deriveUserTotpSecret(config.ggSecretKey, staffId);
    if (!totpVerify(secret, code)) throw new UnauthorizedException('Invalid authenticator code.');
  }

  // ── Resend (updated to use StaffAuthenticator.recipient) ─────────────────

  async resendEmailOtp(challengeToken: string) {
    let challenge: { sub: string; staffId?: string | null; type: string; method: string };
    try {
      challenge = this.jwtService.verify(challengeToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof challenge;
    } catch {
      throw new UnauthorizedException('2FA session expired. Please log in again.');
    }

    if (challenge.type !== '2fa-challenge') throw new BadRequestException('Invalid request.');

    const config = await this.getTwoFAConfig();
    const staffId = challenge.staffId ?? null;

    let recipient: string;
    const userLogin = await this.prisma.userLogin.findUnique({ where: { id: challenge.sub }, select: { email: true } });
    recipient = userLogin?.email ?? '';

    if (staffId) {
      const auth = await this.prisma.staffAuthenticator.findFirst({
        where: { staffId, code: 'Email', isDeleted: false },
        select: { recipient: true },
      });
      if (auth?.recipient) recipient = auth.recipient;
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + config.pinExpiryMinutes * 60 * 1000);

    await this.prisma.loginOtp.updateMany({ where: { userId: challenge.sub, isUsed: false }, data: { isUsed: true } });
    await this.prisma.loginOtp.create({ data: { id: uuidv7(), userId: challenge.sub, otp, expiresAt } });
    await this.emailService.queue2FAOtpEmail(recipient, otp);

    return { success: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private verifySetupToken(setupToken: string): { sub: string; staffId?: string; type: string } {
    try {
      const payload = this.jwtService.verify(setupToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as { sub: string; staffId?: string; type: string };
      if (payload.type !== '2fa-setup-required') throw new Error();
      return payload;
    } catch {
      throw new BadRequestException('Setup token expired or invalid.');
    }
  }

  /** DEV ONLY — returns the current valid TOTP code for a known secret (for Bruno/Playwright tests). */
  devGetCurrentTotp(secret: string) {
    const counter = Math.floor(Date.now() / 1000 / 30);
    const code = totpCode(secret, counter);
    return { success: true, data: { code, validFor: 30 - (Math.floor(Date.now() / 1000) % 30) } };
  }

  /** DEV ONLY — returns current TOTP code derived for a given username (for Bruno/Playwright tests). */
  async devGetDerivedTotpCode(username: string) {
    const userLogin = await this.prisma.userLogin.findFirst({
      where: { username: username.trim(), isDeleted: false },
      select: { staff: { select: { id: true } } },
    });
    const staffId = userLogin?.staff?.id;
    if (!staffId) throw new NotFoundException(`No staff found for username "${username}"`);

    const config = await this.getTwoFAConfig();
    const derivedSecret = deriveUserTotpSecret(config.ggSecretKey, staffId);
    const counter = Math.floor(Date.now() / 1000 / 30);
    const code = totpCode(derivedSecret, counter);
    const validForSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);

    return { success: true, data: { code, validForSeconds, staffId } };
  }

  /** DEV ONLY — returns last unused Login OTP for a given email (for Bruno/Playwright tests). */
  async devGetLastLoginOtp(email: string) {
    const userLogin = await this.prisma.userLogin.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
      select: { id: true },
    });
    if (!userLogin) throw new NotFoundException('No user found with this email');

    const record = await this.prisma.loginOtp.findFirst({
      where: { userId: userLogin.id, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new NotFoundException('No unused Login OTP found for this email');

    return { success: true, data: { otp: record.otp, expiresAt: record.expiresAt } };
  }

}
